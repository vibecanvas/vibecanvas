import { store } from "@/store"
import { throttle } from "@solid-primitives/scheduled"
import { Point, Rectangle } from "pixi.js"
import { applyChangesToCRDT } from "../changes/apply"
import type { AElement } from "../renderables/element.abstract"
import { calculateScaleAndFixedPoint } from "../renderables/transform-box/transform-box.math"
import type { ITransformable, THandle } from "../renderables/transformable.interface"
import type { VirtualGroup } from "../renderables/virtual-group.class"
import type { TChanges, TSnapshot } from "../types"
import type { InputCommand, PointerInputContext, TCommandTarget } from "./types"
import { isElementTarget, isMultiTransformBoxTarget, isTransformBoxTarget, isVirtualGroupTarget } from "./types"

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

export function isScalableTarget(target: TCommandTarget): target is AElement | VirtualGroup {
  return isElementTarget(target) || isVirtualGroupTarget(target)
}

const logOn = false
const log = throttle((...args: any[]) => logOn && console.log('[cmdScale]', ...args), 1000)

// Valid scale handle IDs (corner handles only)
const SCALE_HANDLES = new Set<string>(['nw', 'ne', 'sw', 'se'])

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type TScaleState = {
  targets: ITransformable[]
  startWorld: Point | null
  isScaling: boolean
  activeHandle: THandle | null
  groupStartBounds: Rectangle | null
  // Snapshots for undo
  snapshot: TSnapshot | null
  // Initial bounds for scale calculation (each target's own bounds)
  initialBounds: Map<string, { x: number; y: number; w: number; h: number }>
}

// ─────────────────────────────────────────────────────────────
// Scale State (module-level closure)
// ─────────────────────────────────────────────────────────────

let state: TScaleState = {
  targets: [],
  startWorld: null,
  isScaling: false,
  activeHandle: null,
  groupStartBounds: null,
  snapshot: null,
  initialBounds: new Map(),
}

function resetState(): void {
  state = {
    targets: [],
    startWorld: null,
    isScaling: false,
    activeHandle: null,
    groupStartBounds: null,
    snapshot: null,
    initialBounds: new Map(),
  }
}

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

/** Capture snapshots and initial bounds for all targets */
function captureInitialState(targets: ITransformable[]): void {
  state.initialBounds.clear()

  const snapshot: TSnapshot = { elements: {}, groups: {} }

  for (const target of targets) {
    // IMPORTANT: Invalidate cached bounds for VirtualGroups before reading
    if ('invalidateMembers' in target && typeof target.invalidateMembers === 'function') {
      (target as VirtualGroup).invalidateMembers()
    }

    // Capture snapshot for undo
    const memberSnapshot = target.captureSnapshot()
    snapshot.elements = { ...snapshot.elements, ...memberSnapshot.elements }
    snapshot.groups = { ...snapshot.groups, ...memberSnapshot.groups }

    // Capture initial bounds for scale calculation (now fresh)
    const bounds = target.worldBounds

    state.initialBounds.set(target.id, {
      x: bounds.x,
      y: bounds.y,
      w: bounds.width,
      h: bounds.height,
    })
  }

  state.snapshot = snapshot
}

// ─────────────────────────────────────────────────────────────
// Command Export
// ─────────────────────────────────────────────────────────────

/**
 * Scale command using action/snapshot pattern:
 * 1. pointerdown → captureSnapshot() for all targets
 * 2. pointermove → dispatch(scale) for visual update only
 * 3. pointerup → dispatch(scale) final + applyChangesToCRDT + recordUndo
 *
 * Uses bubbling: if target has parentGroupId, bubble to parent group.
 */
export const cmdScale: InputCommand = (ctx) => {
  if (!SCALE_HANDLES.has(ctx.listenerId)) return false

  // Bubbling: if target has parentGroupId, let parent handle it
  // Only pointer events can bubble (not wheel events)
  if (ctx.eventType === 'pointerdown' && isTransformBoxTarget(ctx.commandTarget)) {
    const transformBoxTarget = ctx.commandTarget.target
    if (isScalableTarget(transformBoxTarget as TCommandTarget) && (transformBoxTarget as AElement | VirtualGroup).parentGroupId) {
      ctx.bubbleImmediate()
      return false
    }
  }

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

  const canvas = ctx.canvas

  // Handle TransformBox target (single element or single group)
  if (isTransformBoxTarget(ctx.commandTarget)) {
    const target = ctx.commandTarget.target

    // IMPORTANT: Invalidate cached bounds BEFORE reading worldBounds
    // VirtualGroup caches _bounds which can be stale from previous operations
    if (isVirtualGroupTarget(target as TCommandTarget)) {
      (target as VirtualGroup).invalidateMembers()
    }

    state.targets = [target]
    state.startWorld = ctx.worldPos
    state.activeHandle = ctx.listenerId as THandle
    state.isScaling = true

    // Use the target's world bounds (now fresh after invalidation)
    const bounds = target.worldBounds
    state.groupStartBounds = new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height)

    // Capture snapshots
    captureInitialState([target])

    return true
  }

  // Handle VirtualGroup target directly
  if (isVirtualGroupTarget(ctx.commandTarget)) {
    // IMPORTANT: Invalidate cached bounds BEFORE reading worldBounds
    ctx.commandTarget.invalidateMembers()

    state.targets = [ctx.commandTarget]
    state.startWorld = ctx.worldPos
    state.activeHandle = ctx.listenerId as THandle
    state.isScaling = true

    const bounds = ctx.commandTarget.worldBounds
    state.groupStartBounds = new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height)

    captureInitialState([ctx.commandTarget])

    return true
  }

  // Handle MultiTransformBox target (multi-selection)
  if (isMultiTransformBoxTarget(ctx.commandTarget)) {
    state.targets = canvas.mapMembers(store.canvasSlice.selectedIds)
    state.startWorld = ctx.worldPos
    state.activeHandle = ctx.listenerId as THandle
    state.isScaling = true

    // Store group bounds at start
    state.groupStartBounds = new Rectangle(
      ctx.commandTarget._bounds.x,
      ctx.commandTarget._bounds.y,
      ctx.commandTarget._bounds.width,
      ctx.commandTarget._bounds.height
    )

    captureInitialState(state.targets)

    return true
  }

  return false
}

function handleMove(ctx: PointerInputContext): boolean {
  if (!state.isScaling) return false
  if (!state.startWorld || !state.groupStartBounds || !state.activeHandle) return false
  if (!ctx.worldPos) return false
  if (logOn) log('handleMove', { ...state })

  // Calculate delta from start position
  const deltaX = ctx.worldPos.x - state.startWorld.x
  const deltaY = ctx.worldPos.y - state.startWorld.y

  // Get scale factor and fixed point using existing helper
  const { scale, fixedPoint } = calculateScaleAndFixedPoint(
    state.activeHandle,
    state.groupStartBounds,
    deltaX,
    deltaY
  )

  // Dispatch scale action for each target (visual update only, no CRDT persist)
  for (const target of state.targets) {
    const initialBounds = state.initialBounds.get(target.id)
    if (!initialBounds) continue

    target.dispatch({
      type: 'scale',
      factor: scale,
      center: fixedPoint,
      initialBounds,
    })
  }

  // Update transform boxes after scale
  for (const target of state.targets) {
    if (isVirtualGroupTarget(target as TCommandTarget)) {
      (target as VirtualGroup).invalidateMembers()
      ;(target as VirtualGroup).redraw()
    } else if (isElementTarget(target as TCommandTarget)) {
      (target as AElement).transformBox?.redraw()
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
  if (!state.isScaling) return false
  if (!state.startWorld || !state.groupStartBounds || !state.activeHandle) {
    resetState()
    return false
  }
  if (!ctx.worldPos) {
    resetState()
    return false
  }

  // Calculate final delta
  const deltaX = ctx.worldPos.x - state.startWorld.x
  const deltaY = ctx.worldPos.y - state.startWorld.y

  // Skip if no movement
  if (deltaX === 0 && deltaY === 0) {
    resetState()
    return true
  }

  // Get final scale factor and fixed point
  const { scale, fixedPoint } = calculateScaleAndFixedPoint(
    state.activeHandle,
    state.groupStartBounds,
    deltaX,
    deltaY
  )

  // Collect all changes from final dispatch
  const allChanges: TChanges[] = []

  for (const target of state.targets) {
    const initialBounds = state.initialBounds.get(target.id)
    if (!initialBounds) continue

    const changes = target.dispatch({
      type: 'scale',
      factor: scale,
      center: fixedPoint,
      initialBounds,
    })
    if (changes) allChanges.push(changes)
  }

  // Persist to CRDT
  if (allChanges.length > 0) {
    applyChangesToCRDT(ctx.canvas.handle, allChanges)
  }

  // Record undo/redo
  const capturedSnapshot = state.snapshot
  const capturedChanges = [...allChanges]
  const capturedCanvas = ctx.canvas
  const capturedTargets = [...state.targets]

  ctx.canvas.undoManager.record({
    label: 'Scale',
    undo: () => capturedTargets.forEach(target => capturedSnapshot && target.restoreSnapshot(capturedSnapshot)),
    redo: () => applyChangesToCRDT(capturedCanvas.handle, capturedChanges),
  })

  // Update transform boxes after final scale
  for (const target of state.targets) {
    if (isVirtualGroupTarget(target as TCommandTarget)) {
      (target as VirtualGroup).invalidateMembers()
      ;(target as VirtualGroup).clearScaleCache()  // Clear scale cache at END of gesture
      ;(target as VirtualGroup).redraw()
    } else if (isElementTarget(target as TCommandTarget)) {
      (target as AElement).transformBox?.redraw()
    }
  }

  if (state.targets.length > 1) {
    ctx.canvas.multiTransformBox.computeGroupBounds()
    ctx.canvas.multiTransformBox.redraw()
  }

  resetState()
  return true
}
