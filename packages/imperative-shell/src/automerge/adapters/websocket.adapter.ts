import {
  NetworkAdapter,
  type PeerId,
  type PeerMetadata,
} from "@automerge/automerge-repo"
import type {
  FromClientMessage,
  FromServerMessage,
} from "@automerge/automerge-repo-network-websocket"

// @ts-ignore - internal module
import { decode, encode } from "@automerge/automerge-repo/helpers/cbor.js"

// Bun ServerWebSocket with data containing isAlive flag
type WebSocketWithIsAlive = {
  data: { isAlive: boolean }
  readyState: number
  ping(): void
  close(): void
  send(data: ArrayBuffer): void
  terminate(): void
}

type ProtocolVersion = "1"
const ProtocolV1: ProtocolVersion = "1"

function isJoinMessage(message: FromClientMessage): message is FromClientMessage & { type: "join" } {
  return message.type === "join"
}

function isLeaveMessage(message: FromClientMessage): message is FromClientMessage & { type: "leave" } {
  return message.type === "leave"
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const { buffer, byteOffset, byteLength } = bytes
  return buffer.slice(byteOffset, byteOffset + byteLength) as ArrayBuffer
}

function log(...data: unknown[]) {
  if (process.env.NODE_ENV === "production") return
  console.log(`[Automerge:${Date.now()}]`, ...data)
}

export class BunWSServerAdapter extends NetworkAdapter {
  private sockets: Record<PeerId, WebSocketWithIsAlive | undefined> = {}
  private keepAliveInterval: number = 5000
  private keepAliveId: Timer | undefined
  private _isReady = false
  private _readyPromise: Promise<void>
  private _resolveReady!: () => void

  constructor() {
    super()
    this._readyPromise = new Promise((resolve) => {
      this._resolveReady = resolve
    })
  }

  isReady(): boolean {
    return this._isReady
  }

  whenReady(): Promise<void> {
    return this._readyPromise
  }

  connect(peerId: PeerId, peerMetadata?: PeerMetadata): void {
    this.peerId = peerId
    this.peerMetadata = peerMetadata
    
    // Emit ready event for automerge-repo compatibility
    if (!this._isReady) {
      this._isReady = true
      this._resolveReady()
      this.emit("ready")
    }
    
    // Clear any existing keepalive to prevent duplicate intervals
    if (this.keepAliveId) {
      clearInterval(this.keepAliveId)
    }
    this.keepAliveId = setInterval(() => {
      const clients = Object.values(this.sockets) as WebSocketWithIsAlive[]
      clients.forEach((socket) => {
        if (!socket) return
        if (socket.data.isAlive) {
          socket.data.isAlive = false
          socket.ping()
        } else {
          this.#terminate(socket)
        }
      })
    }, this.keepAliveInterval)
    log("Adapter connected with peerId:", peerId)
  }

  disconnect(): void {
    clearInterval(this.keepAliveId)
    Object.values(this.sockets).forEach((socket) => {
      if (!socket) return
      this.#terminate(socket)
    })
    log("Adapter disconnected")
  }

  send(message: FromServerMessage): void {
    if (!("targetId" in message) || message.targetId === undefined) {
      log("Cannot send message without targetId")
      return
    }
    if ("data" in message && message.data?.byteLength === 0) {
      throw new Error("Tried to send a zero-length message")
    }

    const senderId = this.peerId
    if (!senderId) {
      log("No peerId set for the websocket server network adapter.")
      return
    }

    const socket = this.sockets[message.targetId]
    if (!socket) {
      log(`Tried to send to disconnected peer: ${message.targetId}`)
      return
    }

    const encoded = encode(message)
    const arrayBuf = toArrayBuffer(encoded)
    socket.send(arrayBuf)
  }

  receiveMessage(messageBytes: Uint8Array, socket: WebSocketWithIsAlive): void {
    const message: FromClientMessage = decode(messageBytes)
    const { type, senderId } = message
    const myPeerId = this.peerId

    if (!myPeerId) {
      console.error('[Adapter:receiveMessage] ERROR: No peerId set')
      log("No peerId set")
      return
    }

    const documentId = "documentId" in message ? "@" + message.documentId : ""
    const { byteLength } = messageBytes
    log(`[${senderId}->${myPeerId}${documentId}] ${type} | ${byteLength} bytes`)

    if (isJoinMessage(message)) {
      const { peerMetadata, supportedProtocolVersions } = message as FromClientMessage & {
        peerMetadata?: PeerMetadata
        supportedProtocolVersions?: ProtocolVersion[]
      }

      const existingSocket = this.sockets[senderId]
      if (existingSocket) {
        log(`Disconnecting existing socket for peer ${senderId}`)
        if (existingSocket.readyState === WebSocket.OPEN) {
          existingSocket.close()
        }
        this.emit("peer-disconnected", { peerId: senderId })
      }

      this.emit("peer-candidate", { peerId: senderId, peerMetadata: peerMetadata ?? {} })
      this.sockets[senderId] = socket as WebSocketWithIsAlive

      const selectedProtocolVersion = this.#selectProtocol(supportedProtocolVersions)
      
      if (selectedProtocolVersion === null) {
        console.error('[Adapter] Protocol version mismatch')
        this.send({
          type: "error",
          senderId: this.peerId!,
          message: "unsupported protocol version",
          targetId: senderId,
        })
        this.sockets[senderId]?.close()
        delete this.sockets[senderId]
      } else {
        this.send({
          type: "peer",
          senderId: this.peerId!,
          peerMetadata: this.peerMetadata ?? {},
          selectedProtocolVersion: ProtocolV1,
          targetId: senderId,
        })
      }
    } else if (isLeaveMessage(message)) {
      const socket = this.sockets[senderId]
      if (!socket) {
        log(`No socket found for leaving peer ${senderId}`)
        return
      }
      this.#terminate(socket)
    } else {
      this.emit("message", message)
    }
  }

  #selectProtocol(versions?: ProtocolVersion[]): ProtocolVersion | null {
    if (versions === undefined) return ProtocolV1
    if (versions.includes(ProtocolV1)) return ProtocolV1
    return null
  }

  #terminate(socket: WebSocketWithIsAlive): void {
    this.#removeSocket(socket)
    socket.terminate()
  }

  #removeSocket(socket: WebSocketWithIsAlive): void {
    const peerId = this.#peerIdBySocket(socket)
    if (!peerId) return
    this.emit("peer-disconnected", { peerId })
    delete this.sockets[peerId as PeerId]
  }

  #peerIdBySocket(socket: WebSocketWithIsAlive): PeerId | null {
    const isThisSocket = (peerId: string) =>
      this.sockets[peerId as PeerId] === socket
    const result = Object.keys(this.sockets).find(isThisSocket) as PeerId
    return result ?? null
  }

  // WebSocket handlers - called by Bun.serve websocket handlers

  open(ws: WebSocketWithIsAlive): void {
    ws.data.isAlive = true
    if (!this._isReady) {
      this._isReady = true
      this._resolveReady()
    }
    log("Client connected")
  }

  close(ws: WebSocketWithIsAlive, code: number, reason: string): void {
    ws.data.isAlive = false
    this.#removeSocket(ws)
    log("Client disconnected", { code, reason: reason || "(none)" })
  }

  pong(ws: WebSocketWithIsAlive, _data: Buffer): void {
    ws.data.isAlive = true
  }

  message(ws: WebSocketWithIsAlive, message: string | Buffer): void {
    ws.data.isAlive = true
    
    if (typeof message === "string") {
      log(`Ignoring string message: ${message.slice(0, 50)}`)
      return
    }
    
    this.receiveMessage(new Uint8Array(message), ws)
  }
}
