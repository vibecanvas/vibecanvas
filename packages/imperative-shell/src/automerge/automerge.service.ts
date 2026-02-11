import { Repo, type PeerId } from "@automerge/automerge-repo"
import { BunWSServerAdapter } from "./adapters/websocket.adapter"
import { BunSqliteStorageAdapter } from "./adapters/sqlite.adapter"

let serverRepo: Repo | null = null
let wsAdapter: BunWSServerAdapter | null = null

export interface AutomergeServerInstance {
  repo: Repo
  wsAdapter: BunWSServerAdapter
}

/**
 * Setup Automerge repo with Bun-native SQLite storage and WebSocket adapter.
 */
export function setupAutomergeServer(databasePath: string): AutomergeServerInstance {
  if (serverRepo && wsAdapter) {
    // In dev mode, ensure adapter is properly connected before returning
    if (!wsAdapter.isReady()) {
      console.log("[Automerge] Existing adapter not ready, reconnecting...")
      wsAdapter.disconnect()
      wsAdapter.connect(serverRepo.peerId!)
    }
    return { repo: serverRepo, wsAdapter }
  }

  wsAdapter = new BunWSServerAdapter()

  serverRepo = new Repo({
    storage: new BunSqliteStorageAdapter(databasePath),
    network: [wsAdapter],
    peerId: `server-${Date.now()}` as PeerId,
  })

  console.log(`[Automerge:${Date.now()}] Repo initialized with SQLite storage: ${databasePath}`)

  return { repo: serverRepo, wsAdapter }
}

/**
 * Get the server repo instance.
 */
export function getServerRepo(): Repo | null {
  return serverRepo
}

/**
 * Get the WebSocket adapter instance.
 */
export function getWSAdapter(): BunWSServerAdapter | null {
  return wsAdapter
}
