import { store, setStore } from "@/store"
import { Point } from "pixi.js"
import { applyChangesToCRDT } from "../changes/apply"
import type { AElement } from "../renderables/element.abstract"
import type { ITransformable } from "../renderables/transformable.interface"
import type { VirtualGroup } from "../renderables/virtual-group.class"
import type { TChanges, TSnapshot } from "../types"
import type { InputCommand, InputContext, PointerInputContext, TCommandTarget } from "./types"
import { isElementTarget, isMultiTransformBoxTarget, isVirtualGroupTarget } from "./types"
import { throttle } from "@solid-primitives/scheduled"
import { selectCmdState } from "./cmd.select-on-click"

export function isDragableTarget(target: TCommandTarget): target is AElement | VirtualGroup {
  return isElementTarget(target) || isVirtualGroupTarget(target)
}

const logOn = false
const log = throttle((...args: any[]) => console.log('[cmdDragSelection]', ...args), 1000)

/**
 * Drag selection command
 * Allows to drag a selected elements groups or multi selected elements on the canvas
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type TDragState = {
  targets: ITransformable[]
  lastWorld: Point | null
  isDragging: boolean
  // Snapshots for undo (keyed by element id)
  snapshot: TSnapshot | null
  // Initial positions for delta calculation
  initialPositions: Map<string, { x: number; y: number }>
  // Clone IDs for special undo handling (delete instead of restore)
  cloneIds: string[] | null
}

// ─────────────────────────────────────────────────────────────
// Drag State (module-level closure)
// ─────────────────────────────────────────────────────────────

let state: TDragState = {
  targets: [],
  lastWorld: null,
  isDragging: false,
  snapshot: null,
  initialPositions: new Map(),
  cloneIds: null,
}

function resetState(): void {
  state = {
    targets: [],
    lastWorld: null,
    isDragging: false,
    snapshot: null,
    initialPositions: new Map(),
    cloneIds: null,
  }
}

/**
 * Handover from clone command to drag command.
 * Called after cloning to seamlessly continue dragging the cloned elements.
 */
export function initiateDragHandover(
  targets: ITransformable[],
  startWorld: Point,
  cloneIds: string[],
  cloneChanges: TChanges[]
): void {
  state.targets = targets
  state.lastWorld = startWorld.clone()
  state.isDragging = true // Already past threshold
  state.cloneIds = cloneIds
  // Store clone changes for redo
  cloneCreationChanges = cloneChanges

  // Capture snapshots for undo (though for clones we delete instead of restore)
  const snapshot: TSnapshot = { elements: {}, groups: {} }
  for (const target of targets) {
    const memberSnapshot = target.captureSnapshot()
    snapshot.elements = { ...snapshot.elements, ...memberSnapshot.elements }
    snapshot.groups = { ...snapshot.groups, ...memberSnapshot.groups }
  }
  state.snapshot = snapshot
}

// Store clone creation changes for redo
let cloneCreationChanges: TChanges[] = []

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

const DRAG_THRESHOLD = 5
function isThresholdReached(ctx: PointerInputContext): boolean {
  if (!selectCmdState.mouseDownWorld || !ctx.worldPos) return false
  const dx = ctx.worldPos.x - selectCmdState.mouseDownWorld.x
  const dy = ctx.worldPos.y - selectCmdState.mouseDownWorld.y
  return Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD
}


/** Check if the target should be handled by this command */
function shouldHandle(ctx: InputContext): boolean {
  if (store.toolbarSlice.activeTool !== 'select') return false
  // Check isDragging first - allows handover from clone to work even with alt held
  if (state.isDragging) return true
  if (ctx.modifiers.alt) return false
  if (!selectCmdState.pendingSelectId) return false
  if (!selectCmdState.mouseDownWorld) return false

  return true
}



// ─────────────────────────────────────────────────────────────
// Command Export
// ─────────────────────────────────────────────────────────────

/**
 * Unified drag command using action/snapshot pattern:
 * 1. pointerdown → captureSnapshot() for all targets
 * 2. pointermove → dispatch(setPosition) for visual update only
 * 3. pointerup → dispatch(setPosition) final + applyChangesToCRDT + recordUndo
 */
export const cmdDragSelection: InputCommand = (ctx) => {
  if (!shouldHandle(ctx)) return false
  const toBubble = isDragableTarget(ctx.commandTarget) && ctx.commandTarget.parentGroupId
  if (toBubble) {
    ctx.bubbleImmediate()
    return false
  }

  if (logOn) log({ ...ctx })

  switch (ctx.eventType) {
    case 'pointerdown':
      return handleDown(ctx)
    case 'pointermove':
      return handleMove(ctx)
    case 'pointerup':
    case 'pointerupoutside':
      return handleUp(ctx)
    default:
      return false
  }
}

// ─────────────────────────────────────────────────────────────
// Event Handlers
// ─────────────────────────────────────────────────────────────

function handleDown(ctx: PointerInputContext): boolean {
  if (logOn) log('handleDown', { ...state }, { ...ctx })
  if (!ctx.worldPos) return false
  const isMultiDrag = isMultiTransformBoxTarget(ctx.commandTarget) 
  || (isDragableTarget(ctx.commandTarget) && store.canvasSlice.selectedIds.length > 1)

  // Handle MultiTransformBox target (multi drag via frame)
  if (isMultiDrag) {
    store.canvasSlice.selectedIds
    state.targets = ctx.canvas.mapMembers(store.canvasSlice.selectedIds)
    state.lastWorld = ctx.worldPos
    state.isDragging = false

    // Capture snapshots for all elements
    const snapshot = { elements: {}, groups: {} }
    for (const target of state.targets) {
      const memberSnapshot = target.captureSnapshot()
      snapshot.elements = { ...snapshot.elements, ...memberSnapshot.elements }
      snapshot.groups = { ...snapshot.groups, ...memberSnapshot.groups }
    }
    state.snapshot = snapshot

    return true
  }

  // Handle draggable targets (AElement or VirtualGroup)
  if (isDragableTarget(ctx.commandTarget)) {
    state.targets = [ctx.commandTarget]
    state.lastWorld = ctx.worldPos
    state.isDragging = false

    // Capture snapshots for all elements
    state.snapshot = ctx.commandTarget.captureSnapshot()

    return true
  }




  return false
}

function handleMove(ctx: PointerInputContext): boolean {
  if (!selectCmdState.mouseDownWorld || !ctx.worldPos || !state.lastWorld) return false
  if (state.targets.length === 0) return false
  if (!state.isDragging && isThresholdReached(ctx)) {
    state.isDragging = true
  }
  if (logOn) log('handleMove', { ...state })

  // prevent movement until we now we are dragging
  if (!state.isDragging) return false // ignores until threshold is reached

  // Calculate delta from start position
  const deltaX = ctx.worldPos.x - state.lastWorld.x
  const deltaY = ctx.worldPos.y - state.lastWorld.y
  state.lastWorld = ctx.worldPos

  // Dispatch setPosition for each element target (visual update only)
  for (const target of state.targets) {
    target.dispatch({ type: 'move', delta: new Point(deltaX, deltaY) })
  }

  // Update transform boxes
  for (const target of state.targets) {
    if (isVirtualGroupTarget(target as TCommandTarget)) {
      (target as VirtualGroup).invalidateMembers()
        ; (target as VirtualGroup).redraw()
    }
  }

  if (state.targets.length > 1) {
    ctx.canvas.multiTransformBox.computeGroupBounds()
    ctx.canvas.multiTransformBox.redraw()
  }

  return true
}

function handleUp(ctx: PointerInputContext): boolean {
  if (logOn) log('handleUp', { ...state }, { ...ctx })
  if (state.targets.length === 0) return false

  const wasDragging = state.isDragging

  if (wasDragging && state.lastWorld && ctx.worldPos) {
    // Calculate final delta
    const deltaX = ctx.worldPos.x - state.lastWorld.x
    const deltaY = ctx.worldPos.y - state.lastWorld.y

    // Collect all changes from final dispatch
    const allChanges: TChanges[] = []

    for (const target of state.targets) {
      const changes = target.dispatch({
        type: 'move',
        delta: new Point(deltaX, deltaY),
      })
      if (changes) allChanges.push(changes)
    }

    // Persist to CRDT
    if (allChanges.length > 0) {
      applyChangesToCRDT(ctx.canvas.handle, allChanges)
    }

    // Record undo/redo
    const capturedSnapshots = state.snapshot
    const capturedChanges = [...allChanges]
    const capturedCanvas = ctx.canvas
    const savedTargets = [...state.targets]
    const savedCloneIds = state.cloneIds ? [...state.cloneIds] : null

    if (savedCloneIds) {
      // Clone operation: undo deletes clones entirely
      const savedCloneCreationChanges = [...cloneCreationChanges]
      ctx.canvas.undoManager.record({
        label: 'Clone',
        undo: () => {
          capturedCanvas.handle.change(doc => {
            for (const id of savedCloneIds) {
              delete doc.elements[id]
            }
          })
          setStore('canvasSlice', 'selectedIds', [])
        },
        redo: () => {
          // Re-apply clone creation and movement changes
          applyChangesToCRDT(capturedCanvas.handle, savedCloneCreationChanges)
          applyChangesToCRDT(capturedCanvas.handle, capturedChanges)
          setStore('canvasSlice', 'selectedIds', savedCloneIds)
        },
      })
      // Reset clone changes
      cloneCreationChanges = []
    } else {
      // Normal move: undo restores positions
      ctx.canvas.undoManager.record({
        label: 'Move',
        undo: () => {
          savedTargets.forEach(target => {
            if (capturedSnapshots) {
              target.restoreSnapshot(capturedSnapshots)
              target.redraw()
            }
          })
          if (savedTargets.length > 1) {
            ctx.canvas.multiTransformBox.computeGroupBounds()
            ctx.canvas.multiTransformBox.redraw()
          }
        },
        redo: () => {
          applyChangesToCRDT(capturedCanvas.handle, capturedChanges)
          ctx.canvas.multiTransformBox.computeGroupBounds()
          ctx.canvas.multiTransformBox.redraw()
        },
      })
    }

    // Update transform boxes after final move
    if (state.targets.length > 1) {
      ctx.canvas.multiTransformBox.computeGroupBounds()
      ctx.canvas.multiTransformBox.redraw()
    }
  }

  resetState()
  return wasDragging
}
