// @refresh reload
import { PathPickerDialog } from "@/components/path-picker-dialog"
import { showToast } from "@/components/ui/Toast"
import { applyChangesToCRDT } from "@/features/canvas-crdt/changes"
import { AElement } from "@/features/canvas-crdt/renderables/element.abstract"
import { CONNECTION_STATE } from "@/features/canvas-crdt/renderables/elements/chat/chat.state-machine"
import { createChatContextLogic } from "@/features/chat/context/chat.context"
import { store } from "@/store"
import { toTildePath } from "@/utils/path-display"
import type { TCanvas } from "@vibecanvas/core/canvas/ctrl.create-canvas"
import type { Accessor, Setter } from "solid-js"
import { ErrorBoundary, Show, createSignal } from "solid-js"
import { ChatDialog } from "./chat-dialog"
import { getDialogView, hasDialogCommand } from "./chat-dialog-commands"
import { createAgentsDialogView } from "./chat-dialog.cmd.agents"
import { createModelsDialogView } from "./chat-dialog.cmd.models"
import { ChatHeader } from "./chat-header"
import { ChatInput } from "./chat-input"
import { ChatMessages } from "./chat-message"
import { StatusLine } from "./status-line"
import { formatTranscript } from "../utils/format-transcript"
import { orpcWebsocketService } from "@/services/orpc-websocket"

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
  chatClass: AElement<"chat">
  canvas: TCanvas
  chatId: string
  onSelect: () => void
  onDragStart: () => void
  onDrag: (delta: { x: number; y: number }) => void
  onDragEnd: () => void
}

export function Chat(props: TChatProps) {
  const [dialogCommand, setDialogCommand] = createSignal<string | null>(null)

  const removeChat = () => {
    const handle = store.canvasSlice.canvas?.handle
    if (!handle) return
    const changes = props.chatClass.dispatch({ type: "delete" })
    if (changes) applyChangesToCRDT(handle, [changes])
  }

  const handleSlashCommand = async (command: string) => {
    if (command === "exit") {
      removeChat()
      return
    }

    if (command === "copy") {
      const transcriptData = chatLogic.getTranscriptData()
      if (!transcriptData) {
        showToast("Copy failed", "No chat session found")
        return
      }

      if (transcriptData.messages.length === 0) {
        showToast("Copy failed", "No messages to copy")
        return
      }

      try {
        const transcript = formatTranscript(
          transcriptData.session,
          transcriptData.messages,
        )
        await navigator.clipboard.writeText(transcript)
        showToast("Copied!", "Chat transcript copied to clipboard")
      } catch (error) {
        console.error("Failed to copy transcript:", error)
        showToast("Copy failed", "Could not access clipboard")
      }
      return
    }

    if (command === "init") {
      try {
        await orpcWebsocketService.client.api.opencode.session.init({
          chatId: props.chatId,
          body: {},
        })
        showToast("Initializing...", "Project context initialized")
      } catch (error) {
        console.error("Init failed:", error)
        showToast("Init failed", "Could not initialize project context")
      }
      return
    }

    if (hasDialogCommand(command)) {
      setDialogCommand(command)
    } else {
      showToast("Slash command not implemented", `/${command} is not implemented yet.`)
    }
  }

  const chatLogic = createChatContextLogic({
    chatId: props.chatId,
    canvas: props.canvas,
    chatClass: props.chatClass,
    getConnectionState: props.state,
    setConnectionState: props.setState,
    getScale: () => props.bounds().scale,
    onSelect: props.onSelect,
    onDragStart: props.onDragStart,
    onDrag: props.onDrag,
    onDragEnd: props.onDragEnd,
  })

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
        title={`${chatLogic.chat()?.title ?? ""} ${chatLogic.chat()?.session_id ?? ""}`}
        subtitle={toTildePath(chatLogic.chat()?.local_path ?? "", chatLogic.homePath())}
        onSetFolder={chatLogic.handleSetFolder}
        onCollapse={() => {
          // TODO: Implement collapse logic
        }}
        onRemove={removeChat}
        onPointerDown={chatLogic.handlePointerDown}
        onPointerMove={chatLogic.handlePointerMove}
        onPointerUp={chatLogic.handlePointerUp}
      />

      <div
        ref={chatLogic.setScrollContainer}
        onScroll={chatLogic.handleScroll}
        class="p-2 text-muted-foreground text-sm flex-1 overflow-y-auto"
      >
        <ErrorBoundary fallback={(err) => <div class="text-red-500">{err.message}</div>}>
          <ChatMessages messages={chatLogic.orderedMessages()} isBusy={chatLogic.isBusy()} />
        </ErrorBoundary>
      </div>

      <Show when={dialogCommand()}>
        <ChatDialog
          view={(() => {
            const cmd = dialogCommand()!
            if (cmd === "agents") {
              return createAgentsDialogView({
                agents: chatLogic.availableAgents() as any,
                selectedAgentName: chatLogic.selectedAgentName(),
                onSelectAgent: chatLogic.setSelectedAgent,
              })
            }
            if (cmd === "models") {
              return createModelsDialogView({
                providers: chatLogic.availableProviders(),
                recentModels: chatLogic.loadRecentModels(),
                selectedModel: chatLogic.selectedModel(),
                onSelectModel: chatLogic.setSelectedModelAndRecord,
              })
            }
            if (cmd === "rename") {
              return {
                id: "rename-dialog",
                title: "Rename Chat",
                items: [{
                  id: "rename-input",
                  label: "New title",
                  inputPlaceholder: "Enter new chat title...",
                  inputValue: chatLogic.chat()?.title ?? "",
                  onInputSubmit: (value) => {
                    if (value.trim()) {
                      chatLogic.renameChat(value.trim())
                      setDialogCommand(null)
                    }
                  }
                }]
              }
            }
            return getDialogView(cmd)
          })()}
          onClose={() => setDialogCommand(null)}
        />
      </Show>

      <ChatInput
        canSend={chatLogic.canSendMessage()}
        onInputFocus={chatLogic.resetToReadyIfFinished}
        onSend={chatLogic.sendMessage}
        onCycleAgent={chatLogic.cycleAgent}
        onFileSearch={chatLogic.searchFileSuggestionsWithOptions}
        onFileSuggestionUsed={chatLogic.handleFileSuggestionUsed}
        onSlashCommand={handleSlashCommand}
        workingDirectoryPath={chatLogic.chat()?.local_path ?? null}
      />

      <StatusLine
        state={props.state}
        agentName={chatLogic.selectedAgentName() ?? chatLogic.statusLineMeta().agentName}
        modelID={chatLogic.statusLineMeta().modelID}
        providerID={chatLogic.statusLineMeta().providerID}
      />

      <PathPickerDialog
        open={chatLogic.isPathDialogOpen()}
        onOpenChange={chatLogic.setIsPathDialogOpen}
        initialPath={chatLogic.chat()?.local_path ?? null}
        onPathSelected={async (path) => {
          await chatLogic.updateLocalPath(path)
          chatLogic.setIsPathDialogOpen(false)
        }}
        title="Select Chat Folder"
        description="Path change starts a new session."
      />
    </div>
  )
}
