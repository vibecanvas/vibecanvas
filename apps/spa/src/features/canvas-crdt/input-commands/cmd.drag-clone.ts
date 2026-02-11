import { setStore, store } from "@/store"
import { InputCommand, isVirtualGroupTarget, isElementTarget, TCommandTarget, isMultiTransformBoxTarget, PointerInputContext, InputContext } from "./types"
import { AElement } from "../renderables/element.abstract"
import { VirtualGroup } from "../renderables/virtual-group.class"
import { throttle } from "@solid-primitives/scheduled"
import { MultiTransformBox } from "../renderables/transform-box/multi-transform-box"
import { selectCmdState } from "./cmd.select-on-click"
import { TChanges } from "../types"
import { applyChangesToCRDT } from "../changes"
import { initiateDragHandover } from "./cmd.drag-selection"

function isCloneableTarget(target: TCommandTarget): target is AElement | VirtualGroup | MultiTransformBox {
  return isElementTarget(target) || isVirtualGroupTarget(target) || isMultiTransformBoxTarget(target)
}

const logOn = false
const log = throttle((...args: any[]) => console.log('[cmdDragClone]', ...args), 1000)

const DRAG_THRESHOLD = 2
function isThresholdReached(ctx: PointerInputContext): boolean {
  if (!selectCmdState.mouseDownWorld || !ctx.worldPos) return false
  const dx = ctx.worldPos.x - selectCmdState.mouseDownWorld.x
  const dy = ctx.worldPos.y - selectCmdState.mouseDownWorld.y
  return Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD
}

const state = {
  hasCloned: false
}


/** Check if the target should be handled by this command */
function shouldHandle(ctx: InputContext): boolean {
  if (store.toolbarSlice.activeTool !== 'select') return false

  return true
}

export const cmdDragClone: InputCommand = (ctx) => {
  if (!shouldHandle(ctx)) return false
  const toBubble = isVirtualGroupTarget(ctx.commandTarget) && ctx.commandTarget.parentGroupId
  if (toBubble) {
    ctx.bubbleImmediate()
    return false
  }

  switch (ctx.eventType) {
    case 'pointermove':
      return handleMove(ctx)
    case 'pointerup':
    case 'pointerupoutside':
      return handleUp(ctx)
    default:
      return false
  }
}

function clone(ctx: Parameters<InputCommand>[0]): boolean {
  if (!isCloneableTarget(ctx.commandTarget)) return false
  if (!selectCmdState.mouseDownWorld) return false

  const cloneIds: string[] = []
  const changes: TChanges[] = []

  if (isMultiTransformBoxTarget(ctx.commandTarget)) {
    ctx.commandTarget.members.forEach(member => {
      const newId = crypto.randomUUID()
      cloneIds.push(newId)
      const ch = member.dispatch({ type: 'clone', id: newId })
      if (ch) changes.push(ch)
    })
  } else if(store.canvasSlice.selectedIds.length > 1 && store.canvasSlice.selectedIds.includes(ctx.commandTarget.id)) {
    // click on item but in multi select
    ctx.canvas.mapMembers(store.canvasSlice.selectedIds).forEach(m => {
      const newId = crypto.randomUUID()
      cloneIds.push(newId)
      const ch = m.dispatch({ type: 'clone', id: newId })
      if (ch) changes.push(ch)
    })

  } else {
    const newId = crypto.randomUUID()
    cloneIds.push(newId)
    const ch = ctx.commandTarget.dispatch({ type: 'clone', id: newId })
    if (ch) changes.push(ch)
  }

  // Persist clones to CRDT
  applyChangesToCRDT(ctx.canvas.handle, changes)

  // Update selection to cloned elements
  setStore('canvasSlice', 'selectedIds', cloneIds)

  // Wait for renderables to be created, then handover to drag-selection
  // The CRDT change event creates renderables synchronously
  setTimeout(() => {
    const clonedTargets = ctx.canvas.mapMembers(cloneIds)
    if (clonedTargets.length > 0) {
      initiateDragHandover(clonedTargets, selectCmdState.mouseDownWorld!, cloneIds, changes)
    }
  }, 0)

  return true
}

function handleMove(ctx: Parameters<InputCommand>[0]): boolean {
  if (!ctx.worldPos) return false
  if (!ctx.modifiers.alt) return false
  if (!isCloneableTarget(ctx.commandTarget)) return false
  if (ctx.commandTarget.id !== selectCmdState.pendingSelectId) return false

  if (!state.hasCloned && isThresholdReached(ctx)) {
    if (logOn) log('handleMove', { ...ctx })
    state.hasCloned = true
    // clone here
    clone(ctx)
    return true // claim event
  }
  return false
}

function handleUp(ctx: Parameters<InputCommand>[0]): boolean {
  state.hasCloned = false
  if (logOn) log('handleUp', { ...ctx })
  return false
}
