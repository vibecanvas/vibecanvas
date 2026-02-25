import type { TDialogView } from "./chat-dialog"

const DIALOG_COMMANDS: Record<string, () => TDialogView> = {}

export function hasDialogCommand(command: string): boolean {
  return command in DIALOG_COMMANDS || command === "agents" || command === "models" || command === "rename"
}

export function getDialogView(command: string): TDialogView {
  if (command === "agents") {
    // Agents is handled specially in chat.tsx with dynamic data
    throw new Error("Agents dialog requires dynamic data - handle in chat.tsx")
  }
  if (command === "models") {
    // Models is handled specially in chat.tsx with dynamic data
    throw new Error("Models dialog requires dynamic data - handle in chat.tsx")
  }
  if (command === "rename") {
    // Rename is handled specially in chat.tsx with dynamic data
    throw new Error("Rename dialog requires dynamic data - handle in chat.tsx")
  }
  const factory = DIALOG_COMMANDS[command]
  if (!factory) throw new Error(`No dialog command: ${command}`)
  return factory()
}
