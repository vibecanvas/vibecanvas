// @refresh reload
import { PathPickerDialog } from "@/components/path-picker-dialog"
import { applyChangesToCRDT } from "@/features/canvas-crdt/changes"
import { AElement } from "@/features/canvas-crdt/renderables/element.abstract"
import { CONNECTION_STATE } from "@/features/canvas-crdt/renderables/elements/chat/chat.state-machine"
import { orpcWebsocketService } from "@/services/orpc-websocket"
import { setStore, store } from "@/store"
import type { TCanvas } from "@vibecanvas/core/canvas/ctrl.create-canvas"
import type { Event as OpenCodeEvent, Message, Part } from "@opencode-ai/sdk/v2"
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

  // Derived memo for rendering
  const orderedMessages = createMemo((): TMessageGroup[] =>
    chatState.messageOrder.map(msgId => ({
      message: chatState.messages[msgId],
      parts: Object.values(chatState.parts)
        .filter((p): p is Part => p != null && p.messageID === msgId),
    })).filter(m => m.message != null)
  )

  const isBusy = () => chatState.sessionStatus.type === "busy"

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

  onMount(async () => {
    if (orpcWebsocketService.websocket.readyState === WebSocket.OPEN) {
      props.setState(CONNECTION_STATE.READY)
    } else {
      return
    }

    const [err, it] = await orpcWebsocketService.safeClient.api.ai.events({
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

    const [promptError] = await orpcWebsocketService.safeClient.api.ai.prompt({
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
        subtitle={chat()?.local_path ?? ''}
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
      />
      <StatusLine state={props.state} />
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
