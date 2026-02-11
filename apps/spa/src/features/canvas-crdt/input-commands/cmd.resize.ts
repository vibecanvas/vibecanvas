import { Point } from "pixi.js"
import type { Canvas } from "../canvas/canvas"
import { applyChangesToCRDT } from "../changes/apply"
import type { AElement } from "../renderables/element.abstract"
import type { TBounds, THandle } from "../renderables/transformable.interface"
import type { TSnapshot } from "../types"
import type { InputCommand, PointerInputContext } from "./types"
import { isTransformBoxTarget } from "./types"

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type TResizeState = {
  isResizing: boolean
  canvas: Canvas | null
  target: AElement | null
  activeHandle: THandle | null
  startWorld: Point | null
  startBounds: TBounds | null
  snapshot: TSnapshot | null
}

// ─────────────────────────────────────────────────────────────
// State (module-level closure)
// ─────────────────────────────────────────────────────────────

const RESIZE_HANDLES = new Set<string>(['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'])

let state: TResizeState = {
  isResizing: false,
  canvas: null,
  target: null,
  activeHandle: null,
  startWorld: null,
  startBounds: null,
  snapshot: null,
}

function resetState(): void {
  if (state.target) {
    state.target.isResizing = false
  }
  state = {
    isResizing: false,
    canvas: null,
    target: null,
    activeHandle: null,
    startWorld: null,
    startBounds: null,
    snapshot: null,
  }
}

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

function restoreFromSnapshot(canvas: Canvas, target: AElement, snapshot: TSnapshot): void {
  const changes = target.restoreSnapshot(snapshot)
  applyChangesToCRDT(canvas.handle, [changes])
}

// ─────────────────────────────────────────────────────────────
// Command Export
// ─────────────────────────────────────────────────────────────

/**
 * Resize command using action/snapshot pattern:
 * 1. pointerdown → captureSnapshot()
 * 2. pointermove → dispatch(resize) for visual update only
 * 3. pointerup → dispatch(resize) final + applyChangesToCRDT + recordUndo
 */
export const cmdResize: InputCommand = (ctx) => {
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
  if (!RESIZE_HANDLES.has(ctx.listenerId)) return false
  if (!ctx.worldPos) return false
  if (!isTransformBoxTarget(ctx.commandTarget)) return false

  // Get the target element from TransformBox
  const transformBox = ctx.commandTarget
  const target = transformBox.target as AElement

  if (!target?.element) return false

  // Initialize state
  state.isResizing = true
  state.canvas = ctx.canvas
  state.target = target
  state.activeHandle = ctx.listenerId as THandle
  state.startWorld = ctx.worldPos.clone()
  state.startBounds = {
    x: target.element.x,
    y: target.element.y,
    w: target.dimensions.w,
    h: target.dimensions.h,
  }

  // Capture snapshot for undo
  state.snapshot = target.captureSnapshot()

  // Set resizing flag on target
  target.isResizing = true

  return true
}

function handleMove(ctx: PointerInputContext): boolean {
  if (!state.isResizing) return false
  if (!state.target || !state.startWorld || !state.activeHandle || !state.startBounds) return false
  if (!ctx.worldPos) return false

  // Dispatch resize action (visual update only, no CRDT persist)
  state.target.dispatch({
    type: 'resize',
    ctx: {
      handle: state.activeHandle,
      startBounds: state.startBounds,
      worldX: ctx.worldPos.x,
      worldY: ctx.worldPos.y,
      startWorldX: state.startWorld.x,
      startWorldY: state.startWorld.y,
      shiftKey: ctx.modifiers.shift,
    },
  })

  return true
}

function handleUp(ctx: PointerInputContext): boolean {
  if (!state.isResizing) return false

  const { canvas, target, startWorld, activeHandle, startBounds, snapshot } = state

  if (canvas && target && startWorld && activeHandle && startBounds && snapshot && ctx.worldPos) {
    // Check if there was actual movement
    const dx = ctx.worldPos.x - startWorld.x
    const dy = ctx.worldPos.y - startWorld.y

    if (dx !== 0 || dy !== 0) {
      // Dispatch final resize action
      const changes = target.dispatch({
        type: 'resize',
        ctx: {
          handle: activeHandle,
          startBounds,
          worldX: ctx.worldPos.x,
          worldY: ctx.worldPos.y,
          startWorldX: startWorld.x,
          startWorldY: startWorld.y,
          shiftKey: ctx.modifiers.shift,
        },
      })

      // Persist to CRDT
      if (changes) {
        applyChangesToCRDT(canvas.handle, [changes])
      }

      // Record undo/redo
      const capturedSnapshot = snapshot
      const capturedChanges = changes ? [changes] : []
      const capturedCanvas = canvas
      const capturedTarget = target

      canvas.undoManager.record({
        label: 'Resize',
        undo: () => restoreFromSnapshot(capturedCanvas, capturedTarget, capturedSnapshot),
        redo: () => applyChangesToCRDT(capturedCanvas.handle, capturedChanges),
      })
    }
  }

  resetState()
  return true
}
