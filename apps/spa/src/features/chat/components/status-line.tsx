import { Show } from "solid-js"
import { Badge } from "@kobalte/core/badge"
import { CONNECTION_STATE } from "@/features/canvas-crdt/renderables/elements/chat/chat.state-machine"
import type { Accessor } from "solid-js"

type TStatusLineProps = {
  state: Accessor<CONNECTION_STATE>
  agentName?: string | null
  modelID?: string | null
  providerID?: string | null
}

const STATE_COLORS: Record<CONNECTION_STATE, string> = {
  [CONNECTION_STATE.NOT_CONNECTED]: 'bg-red-400',
  [CONNECTION_STATE.CONNECTING]: 'bg-amber-400',
  [CONNECTION_STATE.CONNECTED]: 'bg-amber-400',
  [CONNECTION_STATE.FAILED_TO_CONNECT]: 'bg-red-400',
  [CONNECTION_STATE.RETRYING]: 'bg-amber-400',
  [CONNECTION_STATE.READY]: 'bg-green-400',
  [CONNECTION_STATE.STREAMING]: 'bg-green-400',
  [CONNECTION_STATE.REQUESTING_HUMAN_INPUT]: 'bg-green-400',
  [CONNECTION_STATE.PROCESS_REQUEST]: 'bg-green-400',
  [CONNECTION_STATE.FINISHED]: 'bg-green-400',
  [CONNECTION_STATE.ERROR]: 'bg-red-400',
}

const STATE_LABELS: Record<CONNECTION_STATE, string> = {
  [CONNECTION_STATE.NOT_CONNECTED]: 'Not Connected',
  [CONNECTION_STATE.CONNECTING]: 'Connecting...',
  [CONNECTION_STATE.CONNECTED]: 'Connected',
  [CONNECTION_STATE.FAILED_TO_CONNECT]: 'Failed to Connect',
  [CONNECTION_STATE.RETRYING]: 'Retrying...',
  [CONNECTION_STATE.READY]: 'Ready',
  [CONNECTION_STATE.STREAMING]: 'Streaming...',
  [CONNECTION_STATE.REQUESTING_HUMAN_INPUT]: 'Awaiting Input',
  [CONNECTION_STATE.PROCESS_REQUEST]: 'Processing...',
  [CONNECTION_STATE.FINISHED]: 'Finished',
  [CONNECTION_STATE.ERROR]: 'Error',
}

export function StatusLine(props: TStatusLineProps) {
  const modelWithProvider = () => {
    if (!props.modelID) return null
    if (!props.providerID) return props.modelID
    return `${props.providerID}/${props.modelID}`
  }

  return (
    <div class="px-2 py-1 bg-muted border-t border-border text-muted-foreground text-xs font-mono flex items-center justify-between">
      <div class="flex items-center gap-3 min-w-0">
        <span>{STATE_LABELS[props.state()]}</span>
        <Show when={props.agentName}>
          <Badge class="px-1.5 py-0.5 border border-blue-300 bg-blue-100 text-blue-700 truncate max-w-40">
            {props.agentName}
          </Badge>
        </Show>
        <Show when={modelWithProvider()}>
          <span class="text-emerald-700 truncate">{modelWithProvider()}</span>
        </Show>
      </div>
      <span class={`w-3 h-3 rounded-full ${STATE_COLORS[props.state()]}`} />
    </div>
  )
}
