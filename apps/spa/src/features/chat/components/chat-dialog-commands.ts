import type { TDialogView } from "./chat-dialog"
import createTestMenuView from "./chat-dialog.cmd.test-menu"

const DIALOG_COMMANDS: Record<string, () => TDialogView> = {
  "test-menu": createTestMenuView,
}

export function hasDialogCommand(command: string): boolean {
  return command in DIALOG_COMMANDS || command === "agents"
}

export function getDialogView(command: string): TDialogView {
  if (command === "agents") {
    // Agents is handled specially in chat.tsx with dynamic data
    throw new Error("Agents dialog requires dynamic data - handle in chat.tsx")
  }
  const factory = DIALOG_COMMANDS[command]
  if (!factory) throw new Error(`No dialog command: ${command}`)
  return factory()
}
