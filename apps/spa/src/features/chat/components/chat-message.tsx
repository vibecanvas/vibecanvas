import type { Message, Part } from "@opencode-ai/sdk/v2"
import { For, Show, Match, Switch } from "solid-js"

// ----- Types -----

export type TMessageGroup = {
  message: Message
  parts: Part[]
}

type TChatMessagesProps = {
  messages: TMessageGroup[]
  isBusy: boolean
}

// ----- Part Views -----

function TextPartView(props: { part: Part & { type: "text" }; isLastText: boolean; isBusy: boolean }) {
  return (
    <span class="whitespace-pre-wrap">
      {props.part.text}
      <Show when={props.isLastText && props.isBusy}>
        <span class="inline-block w-1.5 h-3 bg-primary animate-pulse ml-0.5" />
      </Show>
    </span>
  )
}

function FilePartView(props: { part: Part & { type: "file" } }) {
  const isImage = () => props.part.mime.startsWith("image/")

  return (
    <Show when={isImage()} fallback={
      <div class="text-xs text-muted-foreground bg-muted/30 px-2 py-1 my-1 border-l-2 border-muted">
        📎 {props.part.filename ?? "file"} ({props.part.mime})
      </div>
    }>
      <img
        src={props.part.url}
        alt={props.part.filename ?? "attached"}
        class="max-w-[150px] max-h-[100px] object-contain border border-border my-1"
      />
    </Show>
  )
}

function ToolPartView(props: { part: Part & { type: "tool" } }) {
  const stateIcon = () => {
    switch (props.part.state.status) {
      case "pending": return "⏳"
      case "running": return "⟳"
      case "completed": return "✓"
      case "error": return "✗"
      default: return "⚡"
    }
  }

  const isRunning = () => props.part.state.status === "running"
  const title = () => {
    const s = props.part.state
    if ("title" in s && s.title) return s.title
    return props.part.tool
  }

  return (
    <div class="text-xs bg-muted/50 px-2 py-1.5 my-1 border-l-2 border-primary/50 font-mono">
      <div class="flex items-center gap-1.5 text-muted-foreground">
        <span class={isRunning() ? "animate-spin" : ""}>
          {stateIcon()}
        </span>
        <span class="font-medium text-foreground">{title()}</span>
      </div>
    </div>
  )
}

function ReasoningPartView(props: { part: Part & { type: "reasoning" } }) {
  return (
    <details class="text-xs my-1 group">
      <summary class="text-muted-foreground cursor-pointer hover:text-foreground">
        Thinking...
      </summary>
      <div class="mt-1 pl-2 border-l-2 border-muted text-muted-foreground whitespace-pre-wrap">
        {props.part.text}
      </div>
    </details>
  )
}

function StepStartPartView() {
  return <div class="border-t border-border/50 my-2" />
}

function StepFinishPartView(props: { part: Part & { type: "step-finish" } }) {
  return (
    <div class="text-[10px] text-muted-foreground/60 my-1 font-mono">
      {props.part.tokens.input}in / {props.part.tokens.output}out
      {" "}· ${props.part.cost.toFixed(4)}
    </div>
  )
}

function AgentPartView(props: { part: Part & { type: "agent" } }) {
  return (
    <div class="text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 my-1 font-mono">
      Agent: {props.part.name}
    </div>
  )
}

function RetryPartView(props: { part: Part & { type: "retry" } }) {
  return (
    <div class="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 my-1 border-l-2 border-amber-400">
      Retry #{props.part.attempt}: {props.part.error.name}
      <Show when={props.part.error.data?.message}>
        <div class="text-[10px] mt-0.5">{props.part.error.data.message}</div>
      </Show>
    </div>
  )
}

// Hidden part types - skip silently
const HIDDEN_PART_TYPES = new Set(["snapshot", "patch", "compaction", "subtask"])

// ----- Message Views -----

function UserMessageView(props: { parts: Part[] }) {
  return (
    <div class="flex justify-end mb-2">
      <div class="bg-primary text-primary-foreground px-3 py-2 max-w-[80%]">
        <div class="text-xs text-primary-foreground/70 mb-1">You</div>
        <For each={props.parts}>
          {(part) => (
            <Switch fallback={null}>
              <Match when={part.type === "text"}>
                <span class="whitespace-pre-wrap">{(part as Part & { type: "text" }).text}</span>
              </Match>
              <Match when={part.type === "file"}>
                <FilePartView part={part as Part & { type: "file" }} />
              </Match>
            </Switch>
          )}
        </For>
      </div>
    </div>
  )
}

function AssistantMessageView(props: { parts: Part[]; isBusy: boolean }) {
  const lastTextPartId = () => {
    const textParts = props.parts.filter(p => p.type === "text")
    return textParts.length > 0 ? textParts[textParts.length - 1].id : null
  }

  return (
    <div class="flex justify-start mb-2">
      <div class="bg-muted text-foreground px-3 py-2 max-w-[80%]">
        <div class="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
          Assistant
        </div>
        <div>
          <For each={props.parts}>
            {(part) => (
              <Switch fallback={null}>
                <Match when={part.type === "text"}>
                  <TextPartView
                    part={part as Part & { type: "text" }}
                    isLastText={part.id === lastTextPartId()}
                    isBusy={props.isBusy}
                  />
                </Match>
                <Match when={part.type === "file"}>
                  <FilePartView part={part as Part & { type: "file" }} />
                </Match>
                <Match when={part.type === "tool"}>
                  <ToolPartView part={part as Part & { type: "tool" }} />
                </Match>
                <Match when={part.type === "reasoning"}>
                  <ReasoningPartView part={part as Part & { type: "reasoning" }} />
                </Match>
                <Match when={part.type === "step-start"}>
                  <StepStartPartView />
                </Match>
                <Match when={part.type === "step-finish"}>
                  <StepFinishPartView part={part as Part & { type: "step-finish" }} />
                </Match>
                <Match when={part.type === "agent"}>
                  <AgentPartView part={part as Part & { type: "agent" }} />
                </Match>
                <Match when={part.type === "retry"}>
                  <RetryPartView part={part as Part & { type: "retry" }} />
                </Match>
                <Match when={HIDDEN_PART_TYPES.has(part.type)}>
                  {null}
                </Match>
              </Switch>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}

// ----- Error View -----

function ErrorMessageView(props: { message: Message & { role: "assistant" } }) {
  const error = () => props.message.error
  const errorMessage = () => {
    const e = error()
    if (!e) return ""
    const data = e.data as Record<string, unknown>
    return typeof data?.message === "string" ? data.message : e.name
  }

  return (
    <Show when={error()}>
      <div class="flex justify-start mb-2">
        <div class="px-3 py-2 max-w-[80%] text-xs bg-destructive/10 border border-destructive text-destructive">
          <div class="font-medium mb-1">Error: {error()!.name}</div>
          <div class="whitespace-pre-wrap">{errorMessage()}</div>
        </div>
      </div>
    </Show>
  )
}

// ----- Main Message List -----

export function ChatMessages(props: TChatMessagesProps) {
  return (
    <div class="flex flex-col">
      <For each={props.messages}>
        {(group) => (
          <Switch fallback={null}>
            <Match when={group.message.role === "user"}>
              <UserMessageView parts={group.parts} />
            </Match>
            <Match when={group.message.role === "assistant"}>
              <AssistantMessageView parts={group.parts} isBusy={props.isBusy} />
              <ErrorMessageView message={group.message as Message & { role: "assistant" }} />
            </Match>
          </Switch>
        )}
      </For>
      <Show when={props.messages.length === 0}>
        <div class="text-muted-foreground text-center py-4">No messages yet</div>
      </Show>
    </div>
  )
}
