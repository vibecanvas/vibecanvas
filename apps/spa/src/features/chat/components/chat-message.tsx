import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk"
import { For, Show, Match, Switch, createMemo } from "solid-js"

// ----- Content Block Types -----

type TTextBlock = { type: "text"; text: string; citations?: unknown[] | null }
type TThinkingBlock = { type: "thinking"; thinking: string; signature: string }
type TRedactedThinkingBlock = { type: "redacted_thinking"; data: string }
type TToolUseBlock = { type: "tool_use"; id: string; name: string; input: unknown }
type TServerToolUseBlock = { type: "server_tool_use"; id: string; name: string; input: unknown }
type TMcpToolUseBlock = { type: "mcp_tool_use"; id: string; name: string; server_name: string; input: unknown }
type TToolResultBlock = { type: string; tool_use_id: string; content?: unknown }
type TImageBlock = {
  type: "image"
  source: {
    type: "base64" | "url"
    data?: string
    url?: string
    media_type?: string
  }
}

type TContentBlock =
  | TTextBlock
  | TThinkingBlock
  | TRedactedThinkingBlock
  | TToolUseBlock
  | TServerToolUseBlock
  | TMcpToolUseBlock
  | TToolResultBlock
  | TImageBlock

// ----- Stream Event Types -----

type TStreamEvent = {
  type: string
  index?: number
  delta?: { type: string; text?: string; thinking?: string }
}

// ----- Type Guards -----

function isUserMessage(msg: SDKMessage): msg is SDKMessage & { type: "user" } {
  return msg.type === "user"
}

function isAssistantMessage(msg: SDKMessage): msg is SDKMessage & { type: "assistant" } {
  return msg.type === "assistant"
}

function isStreamEvent(msg: SDKMessage): msg is SDKMessage & { type: "stream_event"; event: TStreamEvent } {
  return msg.type === "stream_event"
}

function isResultMessage(msg: SDKMessage): msg is SDKMessage & { type: "result" } {
  return msg.type === "result"
}

function isToolProgressMessage(msg: SDKMessage): msg is SDKMessage & { type: "tool_progress" } {
  return msg.type === "tool_progress"
}

// ----- Content Block Rendering -----

function TextBlockView(props: { block: TTextBlock }) {
  return <span class="whitespace-pre-wrap">{props.block.text}</span>
}

function ThinkingBlockView(props: { block: TThinkingBlock }) {
  return (
    <details class="text-xs my-1 group">
      <summary class="text-muted-foreground cursor-pointer hover:text-foreground">
        Thinking...
      </summary>
      <div class="mt-1 pl-2 border-l-2 border-muted text-muted-foreground whitespace-pre-wrap">
        {props.block.thinking}
      </div>
    </details>
  )
}

function RedactedThinkingBlockView() {
  return (
    <div class="text-xs text-muted-foreground italic my-1">
      [Thinking redacted]
    </div>
  )
}

function ToolUseBlockView(props: { block: TToolUseBlock | TServerToolUseBlock | TMcpToolUseBlock }) {
  const serverName = () => "server_name" in props.block ? props.block.server_name : null
  const inputPreview = () => {
    try {
      const input = props.block.input
      if (typeof input === "string") return input.slice(0, 100)
      return JSON.stringify(input).slice(0, 100)
    } catch {
      return "[input]"
    }
  }

  return (
    <div class="text-xs bg-muted/50 px-2 py-1.5 my-1 border-l-2 border-primary/50 font-mono">
      <div class="flex items-center gap-1.5 text-muted-foreground">
        <span class="text-primary">⚡</span>
        <span class="font-medium text-foreground">{props.block.name}</span>
        <Show when={serverName()}>
          <span class="text-muted-foreground">({serverName()})</span>
        </Show>
      </div>
      <Show when={inputPreview()}>
        <div class="mt-1 text-muted-foreground truncate">{inputPreview()}...</div>
      </Show>
    </div>
  )
}

function ToolResultBlockView(props: { block: TToolResultBlock }) {
  const resultType = () => props.block.type.replace("_tool_result", "").replace(/_/g, " ")

  return (
    <div class="text-xs text-muted-foreground bg-muted/30 px-2 py-1 my-1 border-l-2 border-muted">
      ✓ {resultType()} result
    </div>
  )
}

function ContentBlockView(props: { block: TContentBlock }) {
  return (
    <Switch fallback={null}>
      <Match when={props.block.type === "text"}>
        <TextBlockView block={props.block as TTextBlock} />
      </Match>
      <Match when={props.block.type === "thinking"}>
        <ThinkingBlockView block={props.block as TThinkingBlock} />
      </Match>
      <Match when={props.block.type === "redacted_thinking"}>
        <RedactedThinkingBlockView />
      </Match>
      <Match when={props.block.type === "tool_use" || props.block.type === "server_tool_use" || props.block.type === "mcp_tool_use"}>
        <ToolUseBlockView block={props.block as TToolUseBlock} />
      </Match>
      <Match when={props.block.type.endsWith("_tool_result")}>
        <ToolResultBlockView block={props.block as TToolResultBlock} />
      </Match>
    </Switch>
  )
}

// ----- Message Components -----

function UserMessage(props: { message: SDKMessage & { type: "user" } }) {
  const textContent = () => {
    const msg = props.message as { message?: { content?: string | TContentBlock[] } }
    const c = msg.message?.content
    if (typeof c === "string") return c
    if (Array.isArray(c)) {
      return c
        .filter((block): block is TTextBlock => block.type === "text")
        .map((block) => block.text)
        .join("")
    }
    return ""
  }

  const imageBlocks = () => {
    const msg = props.message as { message?: { content?: (TContentBlock | TImageBlock)[] } }
    const c = msg.message?.content
    if (!Array.isArray(c)) return []
    return c.filter((block): block is TImageBlock => block.type === "image")
  }

  return (
    <div class="flex justify-end mb-2">
      <div class="bg-primary text-primary-foreground px-3 py-2 max-w-[80%]">
        <div class="text-xs text-primary-foreground/70 mb-1">You</div>
        <Show when={imageBlocks().length > 0}>
          <div class="flex flex-wrap gap-1 mb-2">
            <For each={imageBlocks()}>
              {(img) => (
                <img
                  src={img.source.type === "base64"
                    ? `data:${img.source.media_type};base64,${img.source.data}`
                    : img.source.url}
                  alt="attached"
                  class="max-w-[150px] max-h-[100px] object-contain border border-primary-foreground/30"
                />
              )}
            </For>
          </div>
        </Show>
        <Show when={textContent()}>
          <div class="whitespace-pre-wrap">{textContent()}</div>
        </Show>
      </div>
    </div>
  )
}

function AssistantMessage(props: { message: SDKMessage & { type: "assistant" } }) {
  const contentBlocks = () => {
    const msg = props.message as { message?: { content?: TContentBlock[] } }
    return msg.message?.content ?? []
  }

  return (
    <div class="flex justify-start mb-2">
      <div class="bg-muted text-foreground px-3 py-2 max-w-[80%]">
        <div class="text-xs text-muted-foreground mb-1">Claude</div>
        <div>
          <For each={contentBlocks()}>
            {(block) => <ContentBlockView block={block} />}
          </For>
        </div>
      </div>
    </div>
  )
}

function StreamingMessage(props: { text: string; isComplete: boolean }) {
  return (
    <div class="flex justify-start mb-2">
      <div class="bg-muted text-foreground px-3 py-2 max-w-[80%]">
        <div class="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
          Claude
          <Show when={!props.isComplete}>
            <span class="inline-block w-1.5 h-3 bg-primary animate-pulse" />
          </Show>
        </div>
        <div class="whitespace-pre-wrap">{props.text}</div>
      </div>
    </div>
  )
}

function ToolProgressView(props: { message: SDKMessage & { type: "tool_progress" } }) {
  const msg = props.message as { tool_name?: string; elapsed_time_seconds?: number }

  return (
    <div class="flex justify-start mb-1">
      <div class="text-xs text-muted-foreground px-3 py-1 flex items-center gap-1.5">
        <span class="animate-spin">⟳</span>
        <span>{msg.tool_name ?? "Tool"} running...</span>
        <Show when={msg.elapsed_time_seconds}>
          <span>({Math.round(msg.elapsed_time_seconds ?? 0)}s)</span>
        </Show>
      </div>
    </div>
  )
}

function ResultMessage(props: { message: SDKMessage & { type: "result" } }) {
  const msg = props.message as {
    subtype?: string
    is_error?: boolean
    result?: string
    errors?: string[]
  }
  const isError = () => msg.is_error === true
  const errorText = () => {
    if (msg.result?.trim()) return msg.result
    if (Array.isArray(msg.errors) && msg.errors.length > 0) {
      return msg.errors.filter(Boolean).join("\n")
    }
    if (msg.subtype?.trim()) {
      return `Agent error: ${msg.subtype.replace(/_/g, " ")}`
    }
    return "Unknown agent error"
  }

  // Only show result message for errors - successful completions are already shown via assistant message
  return (
    <Show when={isError()}>
      <div class="flex justify-start mb-2">
        <div class="px-3 py-2 max-w-[80%] text-xs bg-destructive/10 border border-destructive text-destructive">
          <div class="font-medium mb-1">Error</div>
          <div class="whitespace-pre-wrap">{errorText()}</div>
        </div>
      </div>
    </Show>
  )
}

// ----- Main Message Router -----

export function ChatMessage(props: { message: SDKMessage }) {
  return (
    <Switch fallback={null}>
      <Match when={!props?.message}>{null}</Match>
      <Match when={isUserMessage(props.message)}>
        <UserMessage message={props.message as SDKMessage & { type: "user" }} />
      </Match>
      <Match when={isAssistantMessage(props.message)}>
        <AssistantMessage message={props.message as SDKMessage & { type: "assistant" }} />
      </Match>
      <Match when={isToolProgressMessage(props.message)}>
        <ToolProgressView message={props.message as SDKMessage & { type: "tool_progress" }} />
      </Match>
      <Match when={isResultMessage(props.message)}>
        <ResultMessage message={props.message as SDKMessage & { type: "result" }} />
      </Match>
    </Switch>
  )
}

// ----- Message List with Streaming Support -----

type TChatMessagesProps = {
  messages: SDKMessage[]
}

// Helper to extract content signature from user message for deduplication
// Includes both text and image hashes to handle image-only messages
function extractUserMessageContent(msg: SDKMessage & { type: "user" }): string {
  const content = (msg as { message?: { content?: string | (TContentBlock | TImageBlock)[] } }).message?.content
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    const parts: string[] = []
    for (const block of content) {
      if (block.type === "text") {
        parts.push((block as TTextBlock).text)
      } else if (block.type === "image") {
        // Use first 50 chars of base64 data as a signature for deduplication
        const imgBlock = block as TImageBlock
        const sig = imgBlock.source.data?.slice(0, 50) ?? imgBlock.source.url ?? "img"
        parts.push(`[img:${sig}]`)
      }
    }
    return parts.join("")
  }
  return ""
}

export function ChatMessages(props: TChatMessagesProps) {
  // Process messages: accumulate stream events into streaming text
  const processedMessages = createMemo(() => {
    const messages = props.messages
    const result: Array<{ type: "message"; message: SDKMessage } | { type: "stream"; text: string; isComplete: boolean }> = []

    let streamBuffer = ""
    let hasActiveStream = false

    // Track seen user message contents to deduplicate optimistic + server messages
    const seenUserContents = new Set<string>()

    for (const msg of messages) {
      if (isStreamEvent(msg)) {
        // Accumulate stream deltas
        const event = msg.event as TStreamEvent
        if (event.delta?.text) {
          streamBuffer += event.delta.text
          hasActiveStream = true
        } else if (event.delta?.thinking) {
          // Could optionally show thinking stream
        }
      } else if (isUserMessage(msg) || isAssistantMessage(msg) || isResultMessage(msg) || isToolProgressMessage(msg)) {
        // When hitting an assistant message after streaming, the assistant message
        // already contains the final content, so we don't need to flush the stream buffer.
        // Just clear it to avoid duplicate rendering.
        if (isAssistantMessage(msg) && hasActiveStream) {
          streamBuffer = ""
          hasActiveStream = false
        } else if (hasActiveStream && streamBuffer) {
          // For other message types (user, result, tool_progress), flush the stream
          result.push({ type: "stream", text: streamBuffer, isComplete: true })
          streamBuffer = ""
          hasActiveStream = false
        }

        // Deduplicate user messages by content
        if (isUserMessage(msg)) {
          const content = extractUserMessageContent(msg)
          if (seenUserContents.has(content)) continue // Skip duplicate
          seenUserContents.add(content)
        }

        result.push({ type: "message", message: msg })
      }
    }

    // If there's remaining stream content, show it as active (still streaming)
    if (hasActiveStream && streamBuffer) {
      result.push({ type: "stream", text: streamBuffer, isComplete: false })
    }

    return result
  })

  // Filter to renderable items
  const renderableItems = createMemo(() => processedMessages())

  return (
    <div class="flex flex-col">
      <For each={renderableItems()}>
        {(item) => (
          <Switch>
            <Match when={item.type === "message"}>
              <ChatMessage message={(item as { type: "message"; message: SDKMessage }).message} />
            </Match>
            <Match when={item.type === "stream"}>
              <StreamingMessage
                text={(item as { type: "stream"; text: string; isComplete: boolean }).text}
                isComplete={(item as { type: "stream"; text: string; isComplete: boolean }).isComplete}
              />
            </Match>
          </Switch>
        )}
      </For>
      <Show when={renderableItems().length === 0}>
        <div class="text-muted-foreground text-center py-4">No messages yet</div>
      </Show>
    </div>
  )
}
