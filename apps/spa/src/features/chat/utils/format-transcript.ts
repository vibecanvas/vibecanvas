import type { Message, Part } from "@opencode-ai/sdk/v2"

export type TranscriptOptions = {
  thinking: boolean
  toolDetails: boolean
  assistantMetadata: boolean
}

const DEFAULT_OPTIONS: TranscriptOptions = {
  thinking: false,
  toolDetails: true,
  assistantMetadata: true,
}

export function formatTranscript(
  session: { id: string; title: string; time: { created: number; updated: number } },
  messages: { info: Message; parts: Part[] }[],
  options: TranscriptOptions = DEFAULT_OPTIONS,
): string {
  let transcript = `# ${session.title}\n\n`
  transcript += `**Session ID:** ${session.id}\n`
  transcript += `**Created:** ${new Date(session.time.created).toLocaleString()}\n`
  transcript += `**Updated:** ${new Date(session.time.updated).toLocaleString()}\n\n`
  transcript += `---\n\n`

  for (const msg of messages) {
    transcript += formatMessage(msg.info, msg.parts, options)
    transcript += `---\n\n`
  }

  return transcript
}

function formatAssistantHeader(
  msg: { agent?: string; modelID?: string; providerID?: string; model?: { modelID?: string; providerID?: string }; time?: { created?: number; completed?: number } },
  includeMetadata: boolean,
): string {
  if (!includeMetadata) {
    return `## Assistant\n\n`
  }

  const duration = msg.time?.completed && msg.time?.created
    ? ((msg.time.completed - msg.time.created) / 1000).toFixed(1) + "s"
    : ""

  const modelID = msg.modelID ?? msg.model?.modelID ?? ""
  const agent = msg.agent ?? ""

  return `## Assistant (${agent} · ${modelID}${duration ? ` · ${duration}` : ""})\n\n`
}

function formatMessage(
  msg: Message,
  parts: Part[],
  options: TranscriptOptions,
): string {
  let result = ""

  if (msg.role === "user") {
    result += `## User\n\n`
  } else {
    result += formatAssistantHeader(msg, options.assistantMetadata)
  }

  for (const part of parts) {
    result += formatPart(part, options)
  }

  return result
}

function formatPart(part: Part, options: TranscriptOptions): string {
  if (part.type === "text" && !("synthetic" in part && part.synthetic)) {
    return `${part.text}\n\n`
  }

  if (part.type === "reasoning") {
    if (options.thinking) {
      return `_Thinking:_\n\n${part.text}\n\n`
    }
    return ""
  }

  if (part.type === "tool") {
    let result = `**Tool: ${part.tool}**\n`

    if (options.toolDetails && "input" in part.state && part.state.input) {
      result += `\n**Input:**\n\`\`\`json\n${JSON.stringify(part.state.input, null, 2)}\n\`\`\`\n`
    }

    if (options.toolDetails && part.state.status === "completed" && "output" in part.state && part.state.output) {
      result += `\n**Output:**\n\`\`\`\n${part.state.output}\n\`\`\`\n`
    }

    if (options.toolDetails && part.state.status === "error" && "error" in part.state && part.state.error) {
      result += `\n**Error:**\n\`\`\`\n${part.state.error}\n\`\`\`\n`
    }

    result += `\n`
    return result
  }

  return ""
}
