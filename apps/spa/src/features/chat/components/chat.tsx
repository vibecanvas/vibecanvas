// @refresh reload
import { CONNECTION_STATE } from "@/features/canvas-crdt/renderables/elements/chat/chat.state-machine"
import type { Accessor, Setter } from "solid-js"
import { StatusLine } from "./status-line"
import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk"
import { ChatMessages } from "./chat-message"
import { ChatInput, type TContentBlock } from "./chat-input"
import { ErrorBoundary, createEffect, createResource, createSignal, on, onMount } from "solid-js"
import type { TCanvas } from "@vibecanvas/core/canvas/index"
import * as schema from "@vibecanvas/shell/database/schema"
import { orpcWebsocketService } from "@/services/orpc-websocket"
import { AElement } from "@/features/canvas-crdt/renderables/element.abstract"
import { ChatHeader } from "./chat-header"
import { PathPickerDialog } from "@/components/path-picker-dialog"
import { setStore, store } from "@/store"
import { TBackendChat } from "@/types/backend.types"
import { applyChangesToCRDT } from "@/features/canvas-crdt/changes"

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

/**
 * Chat component that overlays on top of the canvas.
 * Positioned using world coordinates - the parent overlay container
 * has the canvas transform applied, so we just use x/y directly.
 */
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

  const chat = () => store.chatSlice.backendChats[props.canvas.id].find((chat) => chat.id === props.chatId)
  const setChat = (chat: TBackendChat) => setStore('chatSlice', 'backendChats', props.canvas.id, (chats) => chat.id === chat.id ? chat : chats)
  const [isAtBottom, setIsAtBottom] = createSignal(true)
  const [isPathDialogOpen, setIsPathDialogOpen] = createSignal(false)
  const [pendingUserMessages, setPendingUserMessages] = createSignal<SDKUserMessage[]>([])

  const [messages, setMessages] = createResource(() => chat()?.session_id, async (sessionId) => {
    const r = await orpcWebsocketService.client.api["agent-logs"].getBySession({ params: { sessionId } })
    if (!Array.isArray(r)) {
      throw new Error(r.message ?? 'Unknown error')
    }
    return r.map(d => d.data!)
  })

  createEffect(on(
    () => chat()?.session_id,
    (sessionId, previousSessionId) => {
      if (sessionId === null && previousSessionId && previousSessionId !== sessionId) {
        setMessages.mutate([])
        setPendingUserMessages([])
      }
    }
  ))

  createEffect(on(
    () => messages(),
    (currentMessages) => {
      const pending = pendingUserMessages()
      if (pending.length === 0) return

      const hasMessage = (target: SDKUserMessage) =>
        (currentMessages ?? []).some(
          (msg) =>
            msg.type === 'user' &&
            JSON.stringify(msg.message.content) === JSON.stringify(target.message.content)
        )

      const missing = pending.filter((msg) => !hasMessage(msg))
      if (missing.length > 0) {
        setMessages.mutate((list) => [...(list || []), ...missing])
      }
    }
  ))

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
    () => messages(),
    () => {
      if (isAtBottom()) {
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => scrollToBottom())
      }
    }
  ))

  onMount(async () => {
    if (orpcWebsocketService.websocket.readyState === WebSocket.OPEN) {
      props.setState(CONNECTION_STATE.READY)
    } else {
      return
    }

    const [initError, init] = await orpcWebsocketService.safeClient.api.ai.init({canvasId: props.canvas.id, chatId: props.chatId, harness: 'CLAUDE_CODE'})
    if (initError) {
      console.error('init error', initError)
      props.setState(CONNECTION_STATE.ERROR)
      return
    }
    setChat(init)

    orpcWebsocketService.safeClient.api.ai.events({ chatId: props.chatId }).then(async ([err, it]) => {
      if (err) {
        props.setState(CONNECTION_STATE.ERROR)
        return
      }

      for await (const event of it) {
        setMessages.mutate(m => [...(m || []), event])

        if (event.type === 'stream_event' && event.event.type === 'message_start') {
          props.setState(CONNECTION_STATE.STREAMING)
        }

        if (event.type === 'stream_event' && event.event.type === 'message_stop') {
          props.setState(CONNECTION_STATE.FINISHED)
        }
      }
    })
  })

  const handlePointerDown = (e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging = true
    lastPos = { x: e.clientX, y: e.clientY }
    props.onSelect()
    props.onDragStart()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
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
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  const sendMessage = async (content: TContentBlock[]) => {
    // Create optimistic user message matching server structure
    const userMessage: SDKUserMessage = {
      type: 'user' as const,
      session_id: chat()?.session_id ?? '',
      parent_tool_use_id: null,
      message: {
        role: 'user' as const,
        content,
      },
      isSynthetic: false,
    }

    // Add to local state immediately (optimistic update)
    setPendingUserMessages(m => [...m, userMessage])
    setMessages.mutate(m => [...(m || []), userMessage])

    // User is sending a message, so scroll to bottom to see it
    setIsAtBottom(true)
    requestAnimationFrame(() => scrollToBottom())

    // Send to server
    const [promptError] = await orpcWebsocketService.safeClient.api.ai.prompt({
      chatId: props.chatId,
      data: content
    })

    // Handle prompt error or result
    if (promptError) {
      console.error('Prompt error:', promptError)
    }

  }

  const updateLocalPath = async (nextLocalPath: string) => {
    const normalizedPath = nextLocalPath.trim()
    if (!normalizedPath) return

    const [updateError, updatedChat] = await orpcWebsocketService.safeClient.api.chat.update({
      params: { id: props.chatId },
      body: { local_path: normalizedPath },
    })

    if (updateError || !updatedChat) {
      console.error("Failed to update chat local_path", updateError)
      return
    }

    // setChat(updatedChat)
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
        title={chat()?.session_id ?? 'no chat id'}
        subtitle={chat()?.local_path ?? "No folder selected"}
        onSetFolder={handleSetFolder}
        onCollapse={() => {
          // TODO: Implement collapse logic
        }}
        onRemove={( ) => {
          const handle = store.canvasSlice.canvas?.handle
          if(!handle) return // should never happen
          const changes = props.chatClass.dispatch({type: 'delete'})
          if(changes) applyChangesToCRDT(handle, [changes])
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
          <ChatMessages messages={messages() ?? []} />
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
