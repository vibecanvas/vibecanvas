import type { TDialogView } from "./chat-dialog"
import createTestMenuView from "./chat-dialog.cmd.test-menu"

const DIALOG_COMMANDS: Record<string, () => TDialogView> = {
  "test-menu": createTestMenuView,
}

export function hasDialogCommand(command: string): boolean {
  return command in DIALOG_COMMANDS
}

export function getDialogView(command: string): TDialogView {
  const factory = DIALOG_COMMANDS[command]
  if (!factory) throw new Error(`No dialog command: ${command}`)
  return factory()
}
