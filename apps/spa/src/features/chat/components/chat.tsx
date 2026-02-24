// @refresh reload
import { PathPickerDialog } from "@/components/path-picker-dialog"
import { applyChangesToCRDT } from "@/features/canvas-crdt/changes"
import { AElement } from "@/features/canvas-crdt/renderables/element.abstract"
import { CONNECTION_STATE } from "@/features/canvas-crdt/renderables/elements/chat/chat.state-machine"
import { orpcWebsocketService } from "@/services/orpc-websocket"
import { setStore, store } from "@/store"
import { toRelativePathWithinBase, toTildePath } from "@/utils/path-display"
import type { TCanvas } from "@vibecanvas/core/canvas/ctrl.create-canvas"
import type { Event as OpenCodeEvent, Message, Part } from "@opencode-ai/sdk/v2"
import fuzzysort from "fuzzysort"
import type { Accessor, Setter } from "solid-js"
import { ErrorBoundary, createEffect, createMemo, createSignal, on, onMount } from "solid-js"
import { createStore as createSolidStore } from "solid-js/store"
import { ChatHeader } from "./chat-header"
import { ChatInput, type TInputPart } from "./chat-input"
import { ChatMessages, type TMessageGroup } from "./chat-message"
import { StatusLine } from "./status-line"

export type TChatBounds = {
  x: number
  y: number
  w: number
  h: number
  angle: number
  scale: number
}

type TChatProps = {
  bounds: Accessor<TChatBounds>
  state: Accessor<CONNECTION_STATE>
  setState: Setter<CONNECTION_STATE>
  chatClass: AElement<'chat'>
  canvas: TCanvas
  chatId: string
  onSelect: () => void
  onDragStart: () => void
  onDrag: (delta: { x: number; y: number }) => void
  onDragEnd: () => void
}

type TChatState = {
  messages: Record<string, Message>
  parts: Record<string, Part>
  messageOrder: string[]
  sessionStatus: { type: "idle" | "busy" | "retry" }
}

type TFileSuggestion = {
  name: string
  path: string
  isDirectory: boolean
}

type TFileSearchOptions = {
  limit?: number
}

const DEFAULT_FILE_SUGGESTION_LIMIT = 10
const MAX_FILE_SUGGESTION_LIMIT = 200
const DIRECTORY_SEARCH_MULTIPLIER = 20
const mentionUsage = new Map<string, { count: number; lastUsedAt: number }>()

function normalizeUsagePath(path: string): string {
  return path
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .toLowerCase()
}

function toUsageKey(chatId: string, path: string): string {
  return `${chatId}:${normalizeUsagePath(path)}`
}

function recordMentionUsage(chatId: string, path: string) {
  const key = toUsageKey(chatId, path)
  const existing = mentionUsage.get(key)
  const now = Date.now()

  if (existing) {
    mentionUsage.set(key, {
      count: existing.count + 1,
      lastUsedAt: now,
    })
    return
  }

  mentionUsage.set(key, {
    count: 1,
    lastUsedAt: now,
  })
}

function getFrecencyScore(chatId: string, path: string): number {
  const usage = mentionUsage.get(toUsageKey(chatId, path))
  if (!usage) return 0

  const ageMs = Math.max(0, Date.now() - usage.lastUsedAt)
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  const recencyWeight = 1 / (1 + ageDays)
  return usage.count * recencyWeight
}

function getPathDepth(path: string): number {
  return path
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== ".")
    .length
}

function isHiddenPath(path: string): boolean {
  const segments = path
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)

  return segments.some((segment) => segment.startsWith(".") && segment !== "." && segment !== "..")
}

function shouldPrioritizeHidden(query: string): boolean {
  const normalized = query.trim()
  return normalized.includes(".") || normalized.includes("/..")
}

function resolveMentionPath(path: string, basePath: string): string | null {
  const normalizedPath = path.trim().replaceAll("\\", "/")
  if (!normalizedPath) return null

  const isAbsolute = normalizedPath.startsWith("/") || /^[A-Za-z]:\//.test(normalizedPath)
  if (isAbsolute) {
    return toRelativePathWithinBase(normalizedPath, basePath)
  }

  if (normalizedPath === ".") return "."

  const stripped = normalizedPath.replace(/^\.\//, "").replace(/^\/+/, "")
  return stripped.length > 0 ? stripped : null
}

type TConfigStatus = {
  agentName: string | null
  modelID: string | null
  providerID: string | null
}

function extractRuntimeStatusFromMessages(
  messages: Record<string, Message>,
  messageOrder: string[],
): TConfigStatus {
  for (let index = messageOrder.length - 1; index >= 0; index -= 1) {
    const message = messages[messageOrder[index]]
    if (!message || message.role !== "assistant") continue

    const messageRecord = message as unknown as Record<string, unknown>
    const agentName =
      readString(messageRecord.agent)
      ?? readString(messageRecord.mode)

    let modelID: string | null = null
    let providerID: string | null = null

    const directModelID =
      readString(messageRecord.modelID)
      ?? readString(messageRecord.model_id)

    const directProviderID =
      readString(messageRecord.providerID)
      ?? readString(messageRecord.provider_id)

    const modelObject = asRecord(messageRecord.model)
    const modelFromObject = modelObject
      ? {
        modelID:
          readString(modelObject.modelID)
          ?? readString(modelObject.model_id)
          ?? readString(modelObject.id),
        providerID:
          readString(modelObject.providerID)
          ?? readString(modelObject.provider_id),
      }
      : null

    modelID = directModelID ?? modelFromObject?.modelID ?? null
    providerID = directProviderID ?? modelFromObject?.providerID ?? null

    if (agentName || modelID || providerID) {
      return {
        agentName,
        modelID,
        providerID,
      }
    }
  }

  return {
    agentName: null,
    modelID: null,
    providerID: null,
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null
  return value as Record<string, unknown>
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function Chat(props: TChatProps) {
  const SCROLL_THRESHOLD = 50
  const ENABLED_INPUT_STATES = [
    CONNECTION_STATE.READY,
    CONNECTION_STATE.REQUESTING_HUMAN_INPUT,
    CONNECTION_STATE.STREAMING,
    CONNECTION_STATE.PROCESS_REQUEST,
    CONNECTION_STATE.FINISHED,
  ]

  let isDragging = false
  let lastPos = { x: 0, y: 0 }
  let scrollContainerRef: HTMLDivElement | undefined

  const chat = () => store.chatSlice.backendChats[props.canvas.id]?.find((c) => c.id === props.chatId)

  const [chatState, setChatState] = createSolidStore<TChatState>({
    messages: {},
    parts: {},
    messageOrder: [],
    sessionStatus: { type: "idle" },
  })

  const [isAtBottom, setIsAtBottom] = createSignal(true)
  const [isPathDialogOpen, setIsPathDialogOpen] = createSignal(false)
  const [homePath, setHomePath] = createSignal<string | null>(null)

  // Derived memo for rendering
  const orderedMessages = createMemo((): TMessageGroup[] =>
    chatState.messageOrder.map(msgId => ({
      message: chatState.messages[msgId],
      parts: Object.values(chatState.parts)
        .filter((p): p is Part => p != null && p.messageID === msgId),
    })).filter(m => m.message != null)
  )

  const isBusy = () => chatState.sessionStatus.type === "busy"
  const runtimeStatus = createMemo(() => extractRuntimeStatusFromMessages(chatState.messages, chatState.messageOrder))
  const statusLineMeta = createMemo(() => ({
    agentName: runtimeStatus().agentName,
    modelID: runtimeStatus().modelID,
    providerID: runtimeStatus().providerID,
  }))

  const resetToReadyIfFinished = () => {
    if (props.state() === CONNECTION_STATE.FINISHED) {
      props.setState(CONNECTION_STATE.READY)
    }
  }

  const canSendMessage = () => ENABLED_INPUT_STATES.includes(props.state())

  const checkIsAtBottom = () => {
    if (!scrollContainerRef) return true
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef
    return scrollHeight - scrollTop - clientHeight <= SCROLL_THRESHOLD
  }

  const scrollToBottom = () => {
    if (scrollContainerRef) {
      scrollContainerRef.scrollTop = scrollContainerRef.scrollHeight
    }
  }

  const handleScroll = () => {
    setIsAtBottom(checkIsAtBottom())
  }

  // Auto-scroll when messages change, but only if user was at bottom
  createEffect(on(
    () => chatState.messageOrder.length,
    () => {
      if (isAtBottom()) {
        requestAnimationFrame(() => scrollToBottom())
      }
    }
  ))

  // Also auto-scroll on part text deltas when at bottom
  createEffect(on(
    () => {
      // Track the text of the last part for scroll triggering
      const lastMsgId = chatState.messageOrder[chatState.messageOrder.length - 1]
      if (!lastMsgId) return ""
      const parts = Object.values(chatState.parts).filter(
        (p): p is Part => p != null && p.messageID === lastMsgId && p.type === "text"
      )
      const lastPart = parts[parts.length - 1]
      return lastPart && "text" in lastPart ? String(lastPart.text ?? "").length : 0
    },
    () => {
      if (isAtBottom()) {
        requestAnimationFrame(() => scrollToBottom())
      }
    }
  ))

  function handleOpenCodeEvent(event: OpenCodeEvent) {
    const sessionId = chat()?.session_id
    if (!sessionId) return

    switch (event.type) {
      case "message.updated": {
        const msg = event.properties.info
        if (msg.sessionID !== sessionId) return

        // Replace optimistic message if this is a user message
        if (msg.role === "user") {
          const optimistic = chatState.messageOrder.find(id => id.startsWith("optimistic-"))
          if (optimistic) {
            setChatState("messages", optimistic, undefined!)
            setChatState("messageOrder", prev => prev.filter(id => id !== optimistic))
            // Clean up optimistic parts
            for (const [pid, p] of Object.entries(chatState.parts)) {
              if (p?.messageID === optimistic) setChatState("parts", pid, undefined!)
            }
          }
        }

        setChatState("messages", msg.id, msg)
        if (!chatState.messageOrder.includes(msg.id)) {
          setChatState("messageOrder", prev => [...prev, msg.id])
        }
        break
      }

      case "message.part.updated": {
        const { part } = event.properties
        if (part.sessionID !== sessionId) return
        setChatState("parts", part.id, part)
        break
      }

      case "message.part.delta": {
        const { sessionID, partID, field, delta } = event.properties
        if (sessionID !== sessionId) return
        if (field === "text" && chatState.parts[partID]) {
          setChatState("parts", partID, "text" as never, ((prev: string) => (prev ?? "") + delta) as never)
        }
        break
      }

      case "message.part.removed": {
        const { sessionID, partID } = event.properties
        if (sessionID !== sessionId) return
        setChatState("parts", partID, undefined!)
        break
      }

      case "session.status": {
        const { sessionID, status } = event.properties
        if (sessionID !== sessionId) return
        setChatState("sessionStatus", { type: status.type })
        if (status.type === "busy") props.setState(CONNECTION_STATE.STREAMING)
        else if (status.type === "retry") props.setState(CONNECTION_STATE.RETRYING)
        break
      }

      case "session.idle": {
        const { sessionID } = event.properties
        if (sessionID !== sessionId) return
        setChatState("sessionStatus", { type: "idle" })
        props.setState(CONNECTION_STATE.FINISHED)
        break
      }

      case "session.error": {
        if (event.properties.sessionID && event.properties.sessionID !== sessionId) return
        props.setState(CONNECTION_STATE.ERROR)
        break
      }
    }
  }

  const loadPreviousMessages = async () => {
    const sessionId = chat()?.session_id
    if (!sessionId) return

    const [logsError, logsResult] = await orpcWebsocketService.safeClient.api["agent-logs"].getBySession({
      params: { sessionId },
    })

    if (logsError) {
      console.error("Failed to load previous messages", logsError)
      return
    }

    if (!Array.isArray(logsResult)) {
      console.error("Failed to load previous messages", logsResult.message)
      return
    }

    const logsByTime = [...logsResult].sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime()
      const bTime = new Date(b.timestamp).getTime()
      return aTime - bTime
    })

    const messages: Record<string, Message> = {}
    const parts: Record<string, Part> = {}
    const messageOrder: string[] = []

    for (const log of logsByTime) {
      const message = log.data?.info
      if (!message) continue

      messages[message.id] = message
      if (!messageOrder.includes(message.id)) {
        messageOrder.push(message.id)
      }

      for (const part of log.data?.parts ?? []) {
        parts[part.id] = part
      }
    }

    setChatState({
      messages,
      parts,
      messageOrder,
    })
    requestAnimationFrame(() => scrollToBottom())
  }

  const searchFileSuggestionsWithOptions = async (
    query: string,
    options?: TFileSearchOptions,
  ): Promise<TFileSuggestion[]> => {
    const localPath = chat()?.local_path
    if (!localPath) {
      return []
    }

    const requestedLimit = options?.limit ?? DEFAULT_FILE_SUGGESTION_LIMIT
    const safeLimit = Math.min(MAX_FILE_SUGGESTION_LIMIT, Math.max(1, requestedLimit))
    const normalizedQuery = query.trim()
    const includeHiddenFirst = shouldPrioritizeHidden(normalizedQuery)

    const candidateLimit = Math.min(MAX_FILE_SUGGESTION_LIMIT, safeLimit * DIRECTORY_SEARCH_MULTIPLIER)

    const dedupe = new Map<string, TFileSuggestion>()
    const appendPaths = (paths: string[], isDirectory: boolean) => {
      for (const itemPath of paths) {
        const relativePath = resolveMentionPath(itemPath, localPath)
        if (!relativePath) continue

        const normalizedRelative = relativePath.replace(/\/+$/, "")
        if (!normalizedRelative) continue

        const key = `${isDirectory ? "d" : "f"}:${normalizedRelative}`
        if (dedupe.has(key)) continue

        dedupe.set(key, {
          name: normalizedRelative.split("/").at(-1) ?? normalizedRelative,
          path: normalizedRelative,
          isDirectory,
        })
      }
    }

    if (normalizedQuery.length === 0) {
      const [directoryError, directoryResults] = await orpcWebsocketService.safeClient.api.opencode.find.files({
        chatId: props.chatId,
        query: {
          query: "",
          type: "directory",
          limit: candidateLimit,
        },
      })

      if (directoryError || !directoryResults) {
        return []
      }

      appendPaths(directoryResults, true)
    } else {
      const [directoryTuple, fileTuple] = await Promise.all([
        orpcWebsocketService.safeClient.api.opencode.find.files({
          chatId: props.chatId,
          query: {
            query: normalizedQuery,
            type: "directory",
            limit: candidateLimit,
          },
        }),
        orpcWebsocketService.safeClient.api.opencode.find.files({
          chatId: props.chatId,
          query: {
            query: normalizedQuery,
            type: "file",
            limit: candidateLimit,
          },
        }),
      ])

      const [directoryError, directoryResults] = directoryTuple
      const [fileError, fileResults] = fileTuple

      if (!directoryError && directoryResults) {
        appendPaths(directoryResults, true)
      }

      if (!fileError && fileResults) {
        appendPaths(fileResults, false)
      }

      if ((directoryError || !directoryResults) && (fileError || !fileResults)) {
        return []
      }
    }

    const candidates = Array.from(dedupe.values())
    if (candidates.length === 0) {
      return []
    }

    const filtered = normalizedQuery.length > 0
      ? fuzzysort
        .go(normalizedQuery, candidates, {
          key: "path",
          limit: MAX_FILE_SUGGESTION_LIMIT,
        })
        .map((match) => match.obj)
      : candidates

    filtered.sort((a, b) => {
      const aHidden = isHiddenPath(a.path)
      const bHidden = isHiddenPath(b.path)

      if (!includeHiddenFirst && aHidden !== bHidden) {
        return aHidden ? 1 : -1
      }

      if (includeHiddenFirst && aHidden !== bHidden) {
        return aHidden ? -1 : 1
      }

      const frecencyDiff = getFrecencyScore(props.chatId, b.path) - getFrecencyScore(props.chatId, a.path)
      if (frecencyDiff !== 0) {
        return frecencyDiff
      }

      const depthDiff = getPathDepth(a.path) - getPathDepth(b.path)
      if (depthDiff !== 0) {
        return depthDiff
      }

      return a.path.localeCompare(b.path)
    })

    return filtered.slice(0, safeLimit)
  }

  const handleFileSuggestionUsed = (path: string) => {
    recordMentionUsage(props.chatId, path)
  }

  const loadHomePath = async () => {
    const [homeError, homeResult] = await orpcWebsocketService.safeClient.api.file.home()
    if (homeError || !homeResult || "type" in homeResult) return
    setHomePath(homeResult.path)
  }

  onMount(async () => {
    if (orpcWebsocketService.websocket.readyState === WebSocket.OPEN) {
      props.setState(CONNECTION_STATE.READY)
    } else {
      return
    }

    await loadPreviousMessages()
    await loadHomePath()

    const [err, it] = await orpcWebsocketService.safeClient.api.opencode.events({
      chatId: props.chatId,
    })
    if (err) {
      console.error("Events subscription error", err)
      props.setState(CONNECTION_STATE.ERROR)
      return
    }

    for await (const event of it) {
      handleOpenCodeEvent(event)
    }
  })

  const handlePointerDown = (e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging = true
    lastPos = { x: e.clientX, y: e.clientY }
    props.onSelect()
    props.onDragStart()
      ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging) return
    e.preventDefault()

    const scale = props.bounds().scale
    const dx = (e.clientX - lastPos.x) / scale
    const dy = (e.clientY - lastPos.y) / scale

    lastPos = { x: e.clientX, y: e.clientY }
    props.onDrag({ x: dx, y: dy })
  }

  const handlePointerUp = (e: PointerEvent) => {
    if (!isDragging) return
    isDragging = false
    props.onDragEnd()
      ; (e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  const sendMessage = async (parts: TInputPart[]) => {
    const sessionId = chat()?.session_id
    if (!sessionId) return

    // Optimistic user message
    const optMsgId = `optimistic-${Date.now()}`
    setChatState("messages", optMsgId, {
      id: optMsgId,
      sessionID: sessionId,
      role: "user" as const,
      time: { created: Date.now() },
      agent: "",
      model: { providerID: "", modelID: "" },
    } satisfies Message & { role: "user" })
    setChatState("messageOrder", prev => [...prev, optMsgId])

    // Optimistic parts
    for (const [i, part] of parts.entries()) {
      const partId = `optimistic-part-${Date.now()}-${i}`
      const basePart = {
        id: partId,
        sessionID: sessionId,
        messageID: optMsgId,
      }
      if (part.type === "text") {
        setChatState("parts", partId, { ...basePart, type: "text", text: part.text } as Part)
      } else {
        setChatState("parts", partId, {
          ...basePart,
          type: "file",
          mime: part.mime,
          url: part.url,
          filename: part.filename,
        } as Part)
      }
    }

    setIsAtBottom(true)
    requestAnimationFrame(() => scrollToBottom())

    const [promptError] = await orpcWebsocketService.safeClient.api.opencode.prompt({
      chatId: props.chatId,
      parts,
    })
    if (promptError) {
      console.error("Prompt error:", promptError)
    }
  }

  const updateLocalPath = async (nextLocalPath: string) => {
    const normalizedPath = nextLocalPath.trim()
    if (!normalizedPath) return

    // Get world coordinates from the element
    const worldX = props.chatClass.element.x
    const worldY = props.chatClass.element.y

    const [createError, newChat] = await orpcWebsocketService.safeClient.api.chat.create({
      canvas_id: props.canvas.id,
      x: worldX + 30,
      y: worldY + 30,
      title: `Chat - ${normalizedPath.split("/").pop()}`,
      local_path: normalizedPath,
    })

    if (createError || !newChat) {
      console.error("Failed to create new chat", createError)
      return
    }

    setStore("chatSlice", "backendChats", props.canvas.id, (chats) => [...chats, newChat])
  }

  const handleSetFolder = () => {
    setIsPathDialogOpen(true)
  }

  return (
    <div
      class="flex flex-col bg-card text-card-foreground border border-border absolute pointer-events-auto"
      style={{
        left: `${props.bounds().x}px`,
        top: `${props.bounds().y}px`,
        width: `${props.bounds().w}px`,
        height: `${props.bounds().h}px`,
        transform: `translate(-50%, -50%) rotate(${props.bounds().angle}rad) scale(${props.bounds().scale})`,
        "transform-origin": "center",
      }}
    >
      <ChatHeader
        title={(chat()?.title) + ' ' + chat()?.session_id}
        subtitle={toTildePath(chat()?.local_path ?? "", homePath())}
        onSetFolder={handleSetFolder}
        onCollapse={() => {
          // TODO: Implement collapse logic
        }}
        onRemove={() => {
          const handle = store.canvasSlice.canvas?.handle
          if (!handle) return // should never happen
          const changes = props.chatClass.dispatch({ type: 'delete' })
          if (changes) applyChangesToCRDT(handle, [changes])
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        class="p-2 text-muted-foreground text-sm flex-1 overflow-y-auto"
      >
        <ErrorBoundary fallback={(err) => <div class="text-red-500">{err.message}</div>}>
          <ChatMessages messages={orderedMessages()} isBusy={isBusy()} />
        </ErrorBoundary>
      </div>
      <ChatInput
        canSend={canSendMessage()}
        onInputFocus={resetToReadyIfFinished}
        onSend={sendMessage}
        onFileSearch={searchFileSuggestionsWithOptions}
        onFileSuggestionUsed={handleFileSuggestionUsed}
        workingDirectoryPath={chat()?.local_path ?? null}
      />
      <StatusLine
        state={props.state}
        agentName={statusLineMeta().agentName}
        modelID={statusLineMeta().modelID}
        providerID={statusLineMeta().providerID}
      />
      <PathPickerDialog
        open={isPathDialogOpen()}
        onOpenChange={setIsPathDialogOpen}
        initialPath={chat()?.local_path ?? null}
        onPathSelected={async (path) => {
          await updateLocalPath(path)
          setIsPathDialogOpen(false)
        }}
        title="Select Chat Folder"
        description="Path change starts a new session."
      />
    </div>
  )
}
