import { CONNECTION_STATE } from "@/features/canvas-crdt/renderables/elements/chat/chat.state-machine"
import { orpcWebsocketService } from "@/services/orpc-websocket"
import { setStore, store } from "@/store"
import { toRelativePathWithinBase } from "@/utils/path-display"
import type { TCanvas } from "@vibecanvas/core/canvas/ctrl.create-canvas"
import type { Event as OpenCodeEvent, Message, Part } from "@opencode-ai/sdk/v2"
import fuzzysort from "fuzzysort"
import type { Accessor, Setter } from "solid-js"
import { createEffect, createMemo, createSignal, on, onMount } from "solid-js"
import { createStore as createSolidStore } from "solid-js/store"
import type { TInputPart } from "../components/chat-input"
import type { TMessageGroup } from "../components/chat-message"

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

type TStatusMeta = {
  agentName: string | null
  modelID: string | null
  providerID: string | null
}

type TAgent = Awaited<ReturnType<typeof orpcWebsocketService.client.api.opencode.app.agents>>[number]
type TSessionInfo = Awaited<ReturnType<typeof orpcWebsocketService.client.api.opencode.session.current>>

type TConfigProvidersOutput = Awaited<ReturnType<typeof orpcWebsocketService.client.api.opencode.config.providers>>
type TProvider = TConfigProvidersOutput extends { providers: Array<infer P> } ? P : never
type TModel = TProvider extends { models: Record<string, infer M> } ? M : never

type TRecentModel = {
  providerId: string
  modelId: string
  usedAt: number
}

const MAX_RECENT_MODELS = 5
const RECENT_MODELS_KEY = 'vibecanvas-recent-models'

type TCreateChatContextArgs = {
  chatId: string
  canvas: TCanvas
  chatClass: { element: { x: number; y: number } }
  getConnectionState: Accessor<CONNECTION_STATE>
  setConnectionState: Setter<CONNECTION_STATE>
  getScale: Accessor<number>
  onSelect: () => void
  onDragStart: () => void
  onDrag: (delta: { x: number; y: number }) => void
  onDragEnd: () => void
}

const SCROLL_THRESHOLD = 50
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null
  return value as Record<string, unknown>
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function extractRuntimeStatusFromMessages(
  messages: Record<string, Message>,
  messageOrder: string[],
): TStatusMeta {
  for (let index = messageOrder.length - 1; index >= 0; index -= 1) {
    const message = messages[messageOrder[index]]
    if (!message || message.role !== "assistant") continue

    const messageRecord = message as unknown as Record<string, unknown>
    const agentName = readString(messageRecord.agent) ?? readString(messageRecord.mode)

    const directModelID = readString(messageRecord.modelID) ?? readString(messageRecord.model_id)
    const directProviderID = readString(messageRecord.providerID) ?? readString(messageRecord.provider_id)

    const modelObject = asRecord(messageRecord.model)
    const modelFromObject = modelObject
      ? {
        modelID: readString(modelObject.modelID) ?? readString(modelObject.model_id) ?? readString(modelObject.id),
        providerID: readString(modelObject.providerID) ?? readString(modelObject.provider_id),
      }
      : null

    const modelID = directModelID ?? modelFromObject?.modelID ?? null
    const providerID = directProviderID ?? modelFromObject?.providerID ?? null

    if (agentName || modelID || providerID) {
      return { agentName, modelID, providerID }
    }
  }

  return { agentName: null, modelID: null, providerID: null }
}

function getAgentName(agent: TAgent): string | null {
  const record = agent as unknown as Record<string, unknown>
  return readString(record.name)
}

function isSelectableAgent(agent: TAgent): boolean {
  const record = agent as unknown as Record<string, unknown>
  const hidden = record.hidden === true
  const mode = readString(record.mode)
  return !hidden && mode !== "subagent"
}

export function createChatContextLogic(args: TCreateChatContextArgs) {
  const chat = () => store.chatSlice.backendChats[args.canvas.id]?.find((c) => c.id === args.chatId)

  const [chatState, setChatState] = createSolidStore<TChatState>({
    messages: {},
    parts: {},
    messageOrder: [],
    sessionStatus: { type: "idle" },
  })

  const [isAtBottom, setIsAtBottom] = createSignal(true)
  const [isPathDialogOpen, setIsPathDialogOpen] = createSignal(false)
  const [homePath, setHomePath] = createSignal<string | null>(null)
  const [availableAgents, setAvailableAgents] = createSignal<TAgent[]>([])
  const [selectedAgentName, setSelectedAgentName] = createSignal<string | null>(null)
  const [availableProviders, setAvailableProviders] = createSignal<TProvider[]>([])
  const [selectedModel, setSelectedModel] = createSignal<{ providerID: string; modelID: string } | null>(null)
  const [sessionInfo, setSessionInfo] = createSignal<TSessionInfo | null>(null)

  let isDragging = false
  let lastPos = { x: 0, y: 0 }
  let scrollContainerRef: HTMLDivElement | undefined

  const orderedMessages = createMemo((): TMessageGroup[] =>
    chatState.messageOrder.map((msgId) => ({
      message: chatState.messages[msgId],
      parts: Object.values(chatState.parts).filter((p): p is Part => p != null && p.messageID === msgId),
    })).filter((m) => m.message != null),
  )

  const isBusy = () => chatState.sessionStatus.type === "busy"
  const statusLineMeta = createMemo(() => {
    const fromHistory = extractRuntimeStatusFromMessages(chatState.messages, chatState.messageOrder)
    // If a model is selected, always show it (overrides history)
    if (selectedModel()) {
      return {
        agentName: fromHistory.agentName,
        modelID: selectedModel()!.modelID,
        providerID: selectedModel()!.providerID,
      }
    }
    return fromHistory
  })

  const canSendMessage = () => [
    CONNECTION_STATE.READY,
    CONNECTION_STATE.REQUESTING_HUMAN_INPUT,
    CONNECTION_STATE.STREAMING,
    CONNECTION_STATE.PROCESS_REQUEST,
    CONNECTION_STATE.FINISHED,
  ].includes(args.getConnectionState())

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

  const resetToReadyIfFinished = () => {
    if (args.getConnectionState() === CONNECTION_STATE.FINISHED) {
      args.setConnectionState(CONNECTION_STATE.READY)
    }
  }

  function handleOpenCodeEvent(event: OpenCodeEvent) {
    const sessionId = chat()?.session_id
    if (!sessionId) return

    switch (event.type) {
      case "message.updated": {
        const msg = event.properties.info
        if (msg.sessionID !== sessionId) return

        if (msg.role === "user") {
          const optimistic = chatState.messageOrder.find((id) => id.startsWith("optimistic-"))
          if (optimistic) {
            setChatState("messages", optimistic, undefined!)
            setChatState("messageOrder", (prev) => prev.filter((id) => id !== optimistic))
            for (const [pid, p] of Object.entries(chatState.parts)) {
              if (p?.messageID === optimistic) setChatState("parts", pid, undefined!)
            }
          }
        }

        setChatState("messages", msg.id, msg)
        if (!chatState.messageOrder.includes(msg.id)) {
          setChatState("messageOrder", (prev) => [...prev, msg.id])
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
        if (status.type === "busy") args.setConnectionState(CONNECTION_STATE.STREAMING)
        else if (status.type === "retry") args.setConnectionState(CONNECTION_STATE.RETRYING)
        break
      }

      case "session.idle": {
        const { sessionID } = event.properties
        if (sessionID !== sessionId) return
        setChatState("sessionStatus", { type: "idle" })
        args.setConnectionState(CONNECTION_STATE.FINISHED)
        break
      }

      case "session.error": {
        if (event.properties.sessionID && event.properties.sessionID !== sessionId) return
        args.setConnectionState(CONNECTION_STATE.ERROR)
        break
      }

      case "session.updated": {
        const updatedSession = event.properties.info
        if (updatedSession.id !== sessionId) return
        setSessionInfo(updatedSession)
        break
      }
    }
  }

  const loadSessionInfo = async () => {
    const [sessionError, sessionResult] = await orpcWebsocketService.safeClient.api.opencode.session.current({
      chatId: args.chatId,
    })

    if (sessionError || !sessionResult) {
      console.error("Failed to load session info", sessionError)
      return
    }

    setSessionInfo(sessionResult)
  }

  const loadPreviousMessages = async () => {
    const currentChat = chat()
    if (!currentChat) return

    const [messagesError, messagesResult] = await orpcWebsocketService.safeClient.api.opencode.session.messages({
      chatId: args.chatId,
    })

    if (messagesError || !messagesResult) {
      console.error("Failed to load previous messages", messagesError)
      return
    }

    const messagesByTime = [...messagesResult].sort((a, b) => {
      const aTime = Number(a.info.time.created ?? 0)
      const bTime = Number(b.info.time.created ?? 0)
      return aTime - bTime
    })

    const messages: Record<string, Message> = {}
    const parts: Record<string, Part> = {}
    const messageOrder: string[] = []

    for (const entry of messagesByTime) {
      const message = entry.info
      if (!message) continue

      messages[message.id] = message
      if (!messageOrder.includes(message.id)) {
        messageOrder.push(message.id)
      }

      for (const part of entry.parts ?? []) {
        parts[part.id] = part
      }
    }

    setChatState({ messages, parts, messageOrder })

    const historyAgentName = extractRuntimeStatusFromMessages(messages, messageOrder).agentName
    if (historyAgentName) {
      setSelectedAgentName(historyAgentName)
    }

    requestAnimationFrame(() => scrollToBottom())
  }

  const loadAvailableAgents = async () => {
    const [agentsError, agentsResult] = await orpcWebsocketService.safeClient.api.opencode.app.agents({
      chatId: args.chatId,
    })

    if (agentsError || !agentsResult) {
      console.error("Failed to load available agents", agentsError)
      return
    }

    setAvailableAgents(agentsResult)

    const allNames = agentsResult
      .map((agent) => getAgentName(agent))
      .filter((name): name is string => Boolean(name))

    if (allNames.length === 0) {
      setSelectedAgentName(null)
      return
    }

    const current = selectedAgentName()
    if (current && allNames.includes(current)) {
      return
    }

    const historyAgentName = statusLineMeta().agentName
    if (historyAgentName && allNames.includes(historyAgentName)) {
      setSelectedAgentName(historyAgentName)
      return
    }

    const defaultAgentName = (() => {
      const defaultAgent = agentsResult.find((agent) => isSelectableAgent(agent))
      return defaultAgent ? getAgentName(defaultAgent) : null
    })()

    if (defaultAgentName) {
      setSelectedAgentName(defaultAgentName)
      return
    }

    setSelectedAgentName(allNames[0])
  }

  const cycleAgent = (direction: 1 | -1 = 1) => {
    const selectableAgentNames = availableAgents()
      .filter((agent) => isSelectableAgent(agent))
      .map((agent) => getAgentName(agent))
      .filter((name): name is string => Boolean(name))

    if (selectableAgentNames.length === 0) return

    const current = selectedAgentName()
    const currentIndex = current ? selectableAgentNames.indexOf(current) : -1
    const startIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex = (startIndex + direction + selectableAgentNames.length) % selectableAgentNames.length
    setSelectedAgentName(selectableAgentNames[nextIndex])
  }

  const setSelectedAgent = (agentName: string) => {
    setSelectedAgentName(agentName)
  }

  const recordRecentModel = (providerID: string, modelID: string) => {
    try {
      const stored = localStorage.getItem(RECENT_MODELS_KEY)
      const recent: TRecentModel[] = stored ? JSON.parse(stored) : []
      const updated = [
        { providerId: providerID, modelId: modelID, usedAt: Date.now() },
        ...recent.filter((m) => !(m.providerId === providerID && m.modelId === modelID)),
      ].slice(0, MAX_RECENT_MODELS)
      localStorage.setItem(RECENT_MODELS_KEY, JSON.stringify(updated))
    } catch {
      // Ignore localStorage errors
    }
  }

  const loadRecentModels = (): TRecentModel[] => {
    try {
      const stored = localStorage.getItem(RECENT_MODELS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  const setSelectedModelAndRecord = (providerID: string, modelID: string) => {
    setSelectedModel({ providerID, modelID })
    recordRecentModel(providerID, modelID)
  }

  const loadAvailableProviders = async () => {
    const [providersError, providersResult] = await orpcWebsocketService.safeClient.api.opencode.config.providers({
      chatId: args.chatId,
    })

    if (providersError || !providersResult) {
      console.error("Failed to load providers", providersError)
      return
    }

    setAvailableProviders(providersResult.providers)
  }

  const searchFileSuggestionsWithOptions = async (
    query: string,
    options?: TFileSearchOptions,
  ): Promise<TFileSuggestion[]> => {
    const localPath = chat()?.local_path
    if (!localPath) return []

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
        chatId: args.chatId,
        query: {
          query: "",
          type: "directory",
          limit: candidateLimit,
        },
      })

      if (directoryError || !directoryResults) return []
      appendPaths(directoryResults, true)
    } else {
      const [directoryTuple, fileTuple] = await Promise.all([
        orpcWebsocketService.safeClient.api.opencode.find.files({
          chatId: args.chatId,
          query: {
            query: normalizedQuery,
            type: "directory",
            limit: candidateLimit,
          },
        }),
        orpcWebsocketService.safeClient.api.opencode.find.files({
          chatId: args.chatId,
          query: {
            query: normalizedQuery,
            type: "file",
            limit: candidateLimit,
          },
        }),
      ])

      const [directoryError, directoryResults] = directoryTuple
      const [fileError, fileResults] = fileTuple

      if (!directoryError && directoryResults) appendPaths(directoryResults, true)
      if (!fileError && fileResults) appendPaths(fileResults, false)
      if ((directoryError || !directoryResults) && (fileError || !fileResults)) return []
    }

    const candidates = Array.from(dedupe.values())
    if (candidates.length === 0) return []

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

      const frecencyDiff = getFrecencyScore(args.chatId, b.path) - getFrecencyScore(args.chatId, a.path)
      if (frecencyDiff !== 0) return frecencyDiff

      const depthDiff = getPathDepth(a.path) - getPathDepth(b.path)
      if (depthDiff !== 0) return depthDiff

      return a.path.localeCompare(b.path)
    })

    return filtered.slice(0, safeLimit)
  }

  const handleFileSuggestionUsed = (path: string) => {
    recordMentionUsage(args.chatId, path)
  }

  const renameChat = async (newTitle: string) => {
    const [sessionError, updatedSession] = await orpcWebsocketService.safeClient.api.opencode.session.update({
      chatId: args.chatId,
      body: { title: newTitle },
    })

    if (sessionError || !updatedSession) {
      console.error("Failed to update session title", sessionError)
      return
    }

    setSessionInfo(updatedSession)
  }

  const loadHomePath = async () => {
    const [homeError, homeResult] = await orpcWebsocketService.safeClient.api.file.home()
    if (homeError || !homeResult || "type" in homeResult) return
    setHomePath(homeResult.path)
  }

  const sendMessage = async (parts: TInputPart[]) => {
    const sessionId = chat()?.session_id
    if (!sessionId) return

    const optMsgId = `optimistic-${Date.now()}`
    setChatState("messages", optMsgId, {
      id: optMsgId,
      sessionID: sessionId,
      role: "user" as const,
      time: { created: Date.now() },
      agent: selectedAgentName() ?? "",
      model: { providerID: "", modelID: "" },
    } satisfies Message & { role: "user" })
    setChatState("messageOrder", (prev) => [...prev, optMsgId])

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
      chatId: args.chatId,
      agent: selectedAgentName() ?? undefined,
      model: selectedModel() ?? undefined,
      parts,
    })
    if (promptError) {
      console.error("Prompt error:", promptError)
    }
  }

  const updateLocalPath = async (nextLocalPath: string) => {
    const normalizedPath = nextLocalPath.trim()
    if (!normalizedPath) return

    const worldX = args.chatClass.element.x
    const worldY = args.chatClass.element.y

    const [createError, newChat] = await orpcWebsocketService.safeClient.api.chat.create({
      canvas_id: args.canvas.id,
      x: worldX + 30,
      y: worldY + 30,
      local_path: normalizedPath,
    })

    if (createError || !newChat) {
      console.error("Failed to create new chat", createError)
      return
    }

    setStore("chatSlice", "backendChats", args.canvas.id, (chats) => [...chats, newChat])
  }

  const resetSession = () => {
    setChatState({
      messages: {},
      parts: {},
      messageOrder: [],
      sessionStatus: { type: "idle" },
    })
    args.setConnectionState(CONNECTION_STATE.READY)
  }

  const handleSetFolder = () => {
    setIsPathDialogOpen(true)
  }

  const setScrollContainer = (el: HTMLDivElement) => {
    scrollContainerRef = el
  }

  const handlePointerDown = (e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging = true
    lastPos = { x: e.clientX, y: e.clientY }
    args.onSelect()
    args.onDragStart()
      ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging) return
    e.preventDefault()

    const scale = args.getScale()
    const dx = (e.clientX - lastPos.x) / scale
    const dy = (e.clientY - lastPos.y) / scale

    lastPos = { x: e.clientX, y: e.clientY }
    args.onDrag({ x: dx, y: dy })
  }

  const handlePointerUp = (e: PointerEvent) => {
    if (!isDragging) return
    isDragging = false
    args.onDragEnd()
      ; (e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  createEffect(on(
    () => chatState.messageOrder.length,
    () => {
      if (isAtBottom()) {
        requestAnimationFrame(() => scrollToBottom())
      }
    },
  ))

  createEffect(on(
    () => {
      const lastMsgId = chatState.messageOrder[chatState.messageOrder.length - 1]
      if (!lastMsgId) return ""
      const parts = Object.values(chatState.parts).filter(
        (p): p is Part => p != null && p.messageID === lastMsgId && p.type === "text",
      )
      const lastPart = parts[parts.length - 1]
      return lastPart && "text" in lastPart ? String(lastPart.text ?? "").length : 0
    },
    () => {
      if (isAtBottom()) {
        requestAnimationFrame(() => scrollToBottom())
      }
    },
  ))

  onMount(async () => {
    if (orpcWebsocketService.websocket.readyState === WebSocket.OPEN) {
      args.setConnectionState(CONNECTION_STATE.READY)
    } else {
      return
    }

    await loadSessionInfo()
    await loadPreviousMessages()
    await loadAvailableAgents()
    await loadAvailableProviders()
    await loadHomePath()

    const [err, it] = await orpcWebsocketService.safeClient.api.opencode.events({
      chatId: args.chatId,
    })
    if (err) {
      console.error("Events subscription error", err)
      args.setConnectionState(CONNECTION_STATE.ERROR)
      return
    }

    for await (const event of it) {
      handleOpenCodeEvent(event)
    }
  })

  createEffect(on(
    () => chat()?.session_id,
    () => {
      setSessionInfo(null)
      void loadSessionInfo()
    },
  ))

  return {
    chat,
    homePath,
    isBusy,
    orderedMessages,
    canSendMessage,
    resetToReadyIfFinished,
    searchFileSuggestionsWithOptions,
    handleFileSuggestionUsed,
    renameChat,
    resetSession,
    sendMessage,
    statusLineMeta,
    availableAgents,
    selectedAgentName,
    cycleAgent,
    setSelectedAgent,
    availableProviders,
    selectedModel,
    setSelectedModelAndRecord,
    sessionTitle: () => sessionInfo()?.title ?? "Untitled Session",
    loadRecentModels,
    loadAvailableProviders,
    isPathDialogOpen,
    setIsPathDialogOpen,
    updateLocalPath,
    handleSetFolder,
    setScrollContainer,
    handleScroll,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    getTranscriptData: () => {
      const currentChat = chat()
      if (!currentChat) return null

      const messages = orderedMessages().map((group) => ({
        info: group.message,
        parts: group.parts,
      }))

      return {
        session: {
          id: currentChat.session_id,
          title: sessionInfo()?.title ?? "Untitled Session",
          time: {
            created: new Date(currentChat.created_at).getTime(),
            updated: new Date(currentChat.updated_at).getTime(),
          },
        },
        messages,
      }
    },
  }
}
