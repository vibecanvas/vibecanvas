import { Point } from "pixi.js"
import type { Canvas } from "../canvas/canvas"
import type { AElement } from "../renderables/element.abstract"
import type { MultiTransformBox } from "../renderables/transform-box/multi-transform-box"
import { VirtualGroup } from "../renderables/virtual-group.class"
import { rotatePointAroundCenter } from "../renderables/transform-box/transform-box.math"
import type { TSnapshot, TChanges } from "../types"
import type { InputCommand } from "./types"
import { isTransformBoxTarget, isMultiTransformBoxTarget } from "./types"
import { applyChangesToCRDT } from "../changes/apply"

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type TRotateMode = 'single' | 'multi' | null

type TRotateState = {
  mode: TRotateMode
  isRotating: boolean
  // TODO: not needed, is in context
  canvas: Canvas | null
  centerWorld: Point | null
  startAngle: number | null
  // Single rotate
  // TODO: should not care
  target: AElement | null
  startContainerAngle: number | null
  // Multi rotate
  // TODO: use ctx.canvas.multiTransformBox instead
  multiTarget: MultiTransformBox | null
  // Group rotate (VirtualGroup)
  // TODO: should not care
  virtualGroup: VirtualGroup | null
  // Snapshots for undo (keyed by element id)
  snapshots: Map<string, TSnapshot>
  // Initial world positions for multi-rotate
  initialPositions: Map<string, { cx: number; cy: number; angle: number }>
}

// ─────────────────────────────────────────────────────────────
// Rotate State (module-level closure)
// ─────────────────────────────────────────────────────────────

let state: TRotateState = {
  mode: null,
  isRotating: false,
  canvas: null,
  centerWorld: null,
  startAngle: null,
  target: null,
  startContainerAngle: null,
  multiTarget: null,
  virtualGroup: null,
  snapshots: new Map(),
  initialPositions: new Map(),
}

function resetState(): void {
  state = {
    mode: null,
    isRotating: false,
    canvas: null,
    centerWorld: null,
    startAngle: null,
    target: null,
    startContainerAngle: null,
    multiTarget: null,
    virtualGroup: null,
    snapshots: new Map(),
    initialPositions: new Map(),
  }
}

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

/** Get all rotate targets based on mode */
function getTargets(): AElement[] {
  if (state.mode === 'single' && state.target) {
    return [state.target]
  }
  // VirtualGroup rotation - get members
  if (state.virtualGroup) {
    return state.virtualGroup.members as AElement[]
  }
  if (state.mode === 'multi' && state.multiTarget) {
    return state.multiTarget.members as AElement[]
  }
  return []
}

/** Capture snapshots for all targets */
function captureSnapshots(targets: AElement[]): void {
  state.snapshots.clear()
  state.initialPositions.clear()

  for (const target of targets) {
    // Capture snapshot for undo
    state.snapshots.set(target.id, target.captureSnapshot())

    // Capture initial position for multi-rotate
    state.initialPositions.set(target.id, {
      cx: target.worldPosition.x,
      cy: target.worldPosition.y,
      angle: target.rotation,
    })
  }
}

/** Restore all targets from snapshots (for undo) */
function restoreFromSnapshots(canvas: Canvas, snapshots: Map<string, TSnapshot>): void {
  const allChanges: TChanges[] = []

  for (const [id, snapshot] of snapshots) {
    const target = canvas.elements.get(id) as AElement | undefined
    if (target) {
      const changes = target.restoreSnapshot(snapshot)
      allChanges.push(changes)
    }
  }

  if (allChanges.length > 0) {
    applyChangesToCRDT(canvas.handle, allChanges)
  }

  // Update multi transform box if needed
  if (snapshots.size > 1) {
    canvas.multiTransformBox.computeGroupBounds()
    canvas.multiTransformBox.redraw()
  }
}

// ─────────────────────────────────────────────────────────────
// Command Export
// ─────────────────────────────────────────────────────────────

/**
 * Unified rotate command using action/snapshot pattern:
 * 1. pointerdown → captureSnapshot() for all targets
 * 2. pointermove → dispatch(rotate) for visual update only
 * 3. pointerup → dispatch(rotate) final + applyChangesToCRDT + recordUndo
 */
export const cmdRotate: InputCommand = (ctx) => {
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

function handleDown(ctx: Parameters<InputCommand>[0]): boolean {
  if (ctx.listenerId !== 'rotation') return false
  if (!ctx.worldPos) return false

  // Handle single selection (TransformBox)
  if (isTransformBoxTarget(ctx.commandTarget)) {
    const transformBox = ctx.commandTarget

    // Check if this is a VirtualGroup's TransformBox - use multi-rotation logic
    if (transformBox.target instanceof VirtualGroup) {
      const virtualGroup = transformBox.target

      state.mode = 'multi' // Use multi-rotation logic for orbital rotation
      state.virtualGroup = virtualGroup
      state.canvas = ctx.canvas
      state.centerWorld = transformBox.getCenter()
      state.startAngle = Math.atan2(
        ctx.worldPos.y - state.centerWorld.y,
        ctx.worldPos.x - state.centerWorld.x
      )
      state.isRotating = true

      // Capture snapshots for all group members
      const members = virtualGroup.members as AElement[]
      captureSnapshots(members)

      return true
    }

    // Regular single element rotation
    const target = transformBox.target as AElement

    state.mode = 'single'
    state.target = target
    state.canvas = ctx.canvas
    state.centerWorld = transformBox.getCenter()
    state.startAngle = Math.atan2(
      ctx.worldPos.y - state.centerWorld.y,
      ctx.worldPos.x - state.centerWorld.x
    )
    state.startContainerAngle = target.rotation
    state.isRotating = true

    // Capture snapshot for undo
    captureSnapshots([target])

    return true
  }

  // Handle multi-selection (MultiTransformBox)
  if (isMultiTransformBoxTarget(ctx.commandTarget)) {
    state.mode = 'multi'
    state.multiTarget = ctx.commandTarget
    state.canvas = ctx.canvas
    state.centerWorld = ctx.commandTarget.getCenter()
    state.startAngle = Math.atan2(
      ctx.worldPos.y - state.centerWorld.y,
      ctx.worldPos.x - state.centerWorld.x
    )
    state.isRotating = true

    // Capture snapshots for all members
    const members = ctx.commandTarget.members as AElement[]
    captureSnapshots(members)

    return true
  }

  return false
}

function handleMove(ctx: Parameters<InputCommand>[0]): boolean {
  if (!state.isRotating || !state.centerWorld || state.startAngle === null) return false
  if (!ctx.worldPos) return false

  // Calculate current angle from center to pointer
  const angle = Math.atan2(
    ctx.worldPos.y - state.centerWorld.y,
    ctx.worldPos.x - state.centerWorld.x
  )

  let deltaAngle = angle - state.startAngle

  // Shift = snap to 15° increments
  if (ctx.modifiers.shift) {
    const SNAP_ANGLE = Math.PI / 12 // 15 degrees
    if (state.mode === 'single' && state.startContainerAngle !== null) {
      const totalAngle = state.startContainerAngle + deltaAngle
      const snappedAngle = Math.round(totalAngle / SNAP_ANGLE) * SNAP_ANGLE
      deltaAngle = snappedAngle - state.startContainerAngle
    } else {
      deltaAngle = Math.round(deltaAngle / SNAP_ANGLE) * SNAP_ANGLE
    }
  }

  // Handle single selection
  if (state.mode === 'single' && state.target && state.startContainerAngle !== null) {
    const newAngle = state.startContainerAngle + deltaAngle

    // Dispatch rotate action (visual update only, don't persist)
    state.target.dispatch({ type: 'rotate', angle: newAngle })

    return true
  }

  // Handle multi-selection or VirtualGroup - rotate each member around group center
  if (state.mode === 'multi' && (state.multiTarget || state.virtualGroup) && state.centerWorld) {
    const targets = getTargets()

    for (const target of targets) {
      const initial = state.initialPositions.get(target.id)
      if (!initial) continue

      // Rotate position around group center
      const rotated = rotatePointAroundCenter(
        initial.cx, initial.cy,
        state.centerWorld.x, state.centerWorld.y,
        deltaAngle
      )

      // Dispatch setPosition for the rotated position
      target.dispatch({
        type: 'setPosition',
        position: new Point(
          rotated.x - target.localBounds.width / 2,
          rotated.y - target.localBounds.height / 2
        ),
      })

      // Dispatch rotate for the new angle
      target.dispatch({
        type: 'rotate',
        angle: initial.angle + deltaAngle,
      })
    }

    // Update transform box visuals
    if (state.multiTarget) {
      state.multiTarget.computeGroupBounds()
      state.multiTarget.redraw()
    } else if (state.virtualGroup) {
      state.virtualGroup.redraw()
    }

    return true
  }

  return false
}

function handleUp(ctx: Parameters<InputCommand>[0]): boolean {
  if (!state.isRotating) return false

  const canvas = state.canvas
  if (!canvas || !state.centerWorld || state.startAngle === null || !ctx.worldPos) {
    resetState()
    return true
  }

  // Calculate final delta angle
  const angle = Math.atan2(
    ctx.worldPos.y - state.centerWorld.y,
    ctx.worldPos.x - state.centerWorld.x
  )

  let deltaAngle = angle - state.startAngle

  // Shift = snap to 15° increments
  if (ctx.modifiers.shift) {
    const SNAP_ANGLE = Math.PI / 12
    if (state.mode === 'single' && state.startContainerAngle !== null) {
      const totalAngle = state.startContainerAngle + deltaAngle
      const snappedAngle = Math.round(totalAngle / SNAP_ANGLE) * SNAP_ANGLE
      deltaAngle = snappedAngle - state.startContainerAngle
    } else {
      deltaAngle = Math.round(deltaAngle / SNAP_ANGLE) * SNAP_ANGLE
    }
  }

  // Skip if no rotation
  if (Math.abs(deltaAngle) < 0.001) {
    resetState()
    return true
  }

  // Collect all changes from final dispatch
  const allChanges: TChanges[] = []
  const targets = getTargets()

  if (state.mode === 'single' && state.startContainerAngle !== null) {
    const newAngle = state.startContainerAngle + deltaAngle
    for (const target of targets) {
      const changes = target.dispatch({ type: 'rotate', angle: newAngle })
      if (changes) allChanges.push(changes)
    }
  } else if (state.mode === 'multi' && state.centerWorld) {
    for (const target of targets) {
      const initial = state.initialPositions.get(target.id)
      if (!initial) continue

      // Rotate position around group center
      const rotated = rotatePointAroundCenter(
        initial.cx, initial.cy,
        state.centerWorld.x, state.centerWorld.y,
        deltaAngle
      )

      // Dispatch setPosition
      const posChanges = target.dispatch({
        type: 'setPosition',
        position: new Point(
          rotated.x - target.localBounds.width / 2,
          rotated.y - target.localBounds.height / 2
        ),
      })
      if (posChanges) allChanges.push(posChanges)

      // Dispatch rotate
      const rotateChanges = target.dispatch({
        type: 'rotate',
        angle: initial.angle + deltaAngle,
      })
      if (rotateChanges) allChanges.push(rotateChanges)
    }

    // Update transform box visuals
    if (state.multiTarget) {
      canvas.multiTransformBox.computeGroupBounds()
      canvas.multiTransformBox.redraw()
    } else if (state.virtualGroup) {
      state.virtualGroup.redraw()
    }
  }

  // Persist to CRDT
  if (allChanges.length > 0) {
    applyChangesToCRDT(canvas.handle, allChanges)
  }

  // Record undo/redo
  const capturedSnapshots = new Map(state.snapshots)
  const capturedChanges = [...allChanges]
  const capturedCanvas = canvas

  canvas.undoManager.record({
    label: 'Rotate',
    undo: () => restoreFromSnapshots(capturedCanvas, capturedSnapshots),
    redo: () => applyChangesToCRDT(capturedCanvas.handle, capturedChanges),
  })

  resetState()
  return true
}
