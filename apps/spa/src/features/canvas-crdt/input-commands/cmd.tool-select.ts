import type { Tool } from "@/features/floating-drawing-toolbar/types/toolbar.types"
import { TOOL_SHORTCUTS } from "@/features/floating-drawing-toolbar/types/toolbar.types"
import { setStore, store } from "@/store"
import type { InputCommand, KeyboardInputContext } from "./types"

// Track tool before space was pressed (for temporary hand mode)
let toolBeforeSpace: Tool | null = null

/**
 * Handle tool selection via keyboard shortcuts (keydown/keyup)
 * - Number keys 1-9: Select tools
 * - Letter keys h,r,d,o,a,l,p,t: Select tools
 * - Escape: Select tool
 * - Space: Temporary hand tool (hold)
 */
export const cmdToolSelect: InputCommand = (ctx) => {
  switch (ctx.eventType) {
    case 'keydown':
      return handleKeyDown(ctx)
    case 'keyup':
      return handleKeyUp(ctx)
    default:
      return false
  }
}

function handleKeyDown(ctx: KeyboardInputContext): boolean {
  const e = ctx.event as KeyboardEvent

  // Ignore if typing in input/textarea
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return false
  }

  // Space = temporary hand tool
  if (e.key === ' ') {
    e.preventDefault()
    if (toolBeforeSpace === null) {
      toolBeforeSpace = store.toolbarSlice.activeTool
      setStore('toolbarSlice', 'activeTool', 'hand')
    }
    return true
  }

  // Cmd/Ctrl+B = toggle sidebar
  if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'b') {
    e.preventDefault()
    setStore('sidebarVisible', v => !v)
    return true
  }

  // Check for tool shortcut (ignore if modifier keys are pressed for browser shortcuts)
  if (e.ctrlKey || e.metaKey || e.altKey) {
    return false
  }

  const tool = TOOL_SHORTCUTS[e.key]
  if (tool) {
    setStore('toolbarSlice', 'activeTool', tool)
    return true
  }

  return false
}

function handleKeyUp(ctx: KeyboardInputContext): boolean {
  const e = ctx.event as KeyboardEvent

  // Release space = restore previous tool
  if (e.key === ' ' && toolBeforeSpace !== null) {
    setStore('toolbarSlice', 'activeTool', toolBeforeSpace)
    toolBeforeSpace = null
    return true
  }

  return false
}
