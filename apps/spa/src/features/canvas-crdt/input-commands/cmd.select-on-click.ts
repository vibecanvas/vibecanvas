import { setStore, store } from "@/store"
import { throttle } from "@solid-primitives/scheduled"
import type { InputCommand, PointerInputContext, TCommandTarget } from "./types"
import { isElementTarget, isVirtualGroupTarget } from "./types"
import type { AElement } from "../renderables/element.abstract"
import type { VirtualGroup } from "../renderables/virtual-group.class"
import { Point } from "pixi.js"
import { applyChangesToCRDT } from "../changes/apply"

const log = throttle((...args: any[]) => console.log('[cmdSelectOnClick]', ...args), 1000)
const logOn = false

const DOUBLE_CLICK_THRESHOLD = 400 // ms
const DRAG_THRESHOLD = 5 // pixels - same as drag-selection

const isSelectableTarget = (target: TCommandTarget): target is AElement | VirtualGroup => {
  return isElementTarget(target) || isVirtualGroupTarget(target)
}

export const selectCmdState: {
  mouseDownWorld: Point | null
  pendingSelectId: string | null
  // Double-click tracking
  lastClickTime: number
  lastClickTargetId: string | null
} = {
  mouseDownWorld: null,
  // Track pending selection for click vs drag detection
  pendingSelectId: null,
  // Double-click tracking
  lastClickTime: 0,
  lastClickTargetId: null,
}

/** Check if the pointer stayed within drag threshold (actual click vs drag) */
function wasActualClick(ctx: PointerInputContext): boolean {
  if (!selectCmdState.mouseDownWorld) return true
  if (!('worldPos' in ctx) || !ctx.worldPos) return true

  const dx = ctx.worldPos.x - selectCmdState.mouseDownWorld.x
  const dy = ctx.worldPos.y - selectCmdState.mouseDownWorld.y
  return Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD
}

function resetState(): void {
  selectCmdState.mouseDownWorld = null
  selectCmdState.pendingSelectId = null
  // NOTE: Don't reset lastClickTime/lastClickTargetId here!
  // They need to persist across click cycles for double-click detection
}

/**
 * Handle clicking on a selectable to select it
 * - Normal click: select the clicked selectable
 * - Shift+click: add/remove selectable to selection
 * 
 * Let's other commands handle the rest. E.g. dragging, post selection actions, etc.
 */
export const cmdSelectOnClick: InputCommand = (ctx) => {
  if (store.toolbarSlice.activeTool !== 'select') return false
  if (!isSelectableTarget(ctx.commandTarget)) return false
  const bubbleUp = isSelectableTarget(ctx.commandTarget) && ctx.commandTarget.parentGroupId
  if (bubbleUp) {
    ctx.bubbleImmediate()
    return false
  }

  switch (ctx.eventType) {
    case 'pointerdown':
      return handleDown(ctx)
    case 'pointerup':
      return handleUp(ctx)
    default:
      return false
  }
}

function handleDown(ctx: PointerInputContext): boolean {
  if (logOn) log('handleDown', { ...ctx })
  if (!isSelectableTarget(ctx.commandTarget)) return false
  const selectableId = ctx.commandTarget.id
  selectCmdState.pendingSelectId = selectableId
  selectCmdState.mouseDownWorld = ctx.worldPos
  const previousSelection = [...store.canvasSlice.selectedIds]
  let newSelection: string[] | null = null

  if (ctx.modifiers.shift) {
    // Shift+click: toggle id in selection immediately
    if (previousSelection.includes(selectableId)) {
      newSelection = previousSelection.filter(id => id !== selectableId)
    } else {
      newSelection = [...previousSelection, selectableId]
    }

  } else {
    if (previousSelection.length == 0) {
      newSelection = [selectableId]
    } else if (!previousSelection.includes(selectableId)) {
      newSelection = [selectableId]
    } else {
      // TODO: in multi select when click on item is select or drag? Must listen on pointerup to see if it was a click or a drag
      // not implemented yet
    }
  }

  ctx.canvas.undoManager.record({
    undo: () => {
      setStore('canvasSlice', 'selectedIds', previousSelection)
    },
    redo: () => {
      if (newSelection) setStore('canvasSlice', 'selectedIds', newSelection)
    },
    label: 'Toggle selection'
  })

  if (newSelection) setStore('canvasSlice', 'selectedIds', newSelection)

  return false
}

function handleUp(ctx: PointerInputContext): boolean {
  if (logOn) log('handleUp', { ...ctx })
  if (!selectCmdState.pendingSelectId) return false
  if (!isSelectableTarget(ctx.commandTarget)) return false

  const selectableId = ctx.commandTarget.id
  const now = Date.now()

  // Only count as click if drag threshold was NOT reached
  if (wasActualClick(ctx)) {
    // Check for double-click
    const isDoubleClick =
      selectCmdState.lastClickTargetId === selectableId &&
      (now - selectCmdState.lastClickTime) < DOUBLE_CLICK_THRESHOLD

    if (isDoubleClick) {
      if (logOn) log('double-click on:', selectableId)
      const changes = ctx.commandTarget.dispatch({ type: 'enter' })
      if (changes) applyChangesToCRDT(ctx.canvas.handle, [changes])

      // Reset to prevent triple-click = another double
      selectCmdState.lastClickTime = 0
      selectCmdState.lastClickTargetId = null
    } else {
      // Update tracking for next potential double-click
      selectCmdState.lastClickTime = now
      selectCmdState.lastClickTargetId = selectableId
    }
  } else {
    // Was a drag, reset double-click tracking
    selectCmdState.lastClickTime = 0
    selectCmdState.lastClickTargetId = null
  }

  resetState()

  return false // let other commands handle the rest
}
