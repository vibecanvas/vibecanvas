import type { InputCommand } from "./types"

export const cmdUndoRedo: InputCommand = (ctx) => {
  if (ctx.eventType !== 'keydown') return false

  const e = ctx.event as KeyboardEvent
  const mod = e.metaKey || e.ctrlKey

  // Ignore if typing in input/textarea
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return false
  }

  if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault()
    ctx.canvas.undoManager.undo()
    return true
  }

  if (mod && e.key.toLowerCase() === 'z' && e.shiftKey) {
    e.preventDefault()
    ctx.canvas.undoManager.redo()
    return true
  }

  if (mod && e.key.toLowerCase() === 'y') {
    e.preventDefault()
    ctx.canvas.undoManager.redo()
    return true
  }

  return false
}