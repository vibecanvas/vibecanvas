import type { Bounds, Point, Rectangle } from "pixi.js"
import type { TAction, TActionType, TChanges, TSnapshot } from "../types"
import type { TransformBox } from "./transform-box/transform-box"

// ─────────────────────────────────────────────────────────────
// SELECTABLE
// ─────────────────────────────────────────────────────────────
// NOTE: Might not be needed as extra interface, only when we can select without transformable
export interface ISelectable {
  readonly id: string
  isSelected: boolean
  isDragging: boolean
  isResizing: boolean
  isRotating: boolean
  transformBox?: TransformBox | null
}

// ─────────────────────────────────────────────────────────────
// TRANSFORM BOX TYPES
// ─────────────────────────────────────────────────────────────

/**
 * TransformBox display modes:
 * - 'full': Shows frame edges + corner handles + rotation handle (single selection)
 * - 'frame': Shows only frame edges, no handles (member of multi-selection)
 */
export type TTransformBoxMode = 'full' | 'frame'
export type THandle = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'

export type TTransformContextConfig<T = unknown> = {
  owner: T

  // Mode determines which handles are shown
  mode?: TTransformBoxMode

  // Resize callbacks (shape-specific logic)
  onResize: (ctx: TResizeContext) => void

  // Rotate callbacks
  onRotate: (angle: number, shiftKey: boolean) => void
  onRotateStart?: (startAngle: number) => void
  onRotateEnd?: () => void
}

export type TBounds = { x: number; y: number; w: number; h: number }

export type TResizeContext = {
  handle: THandle
  /** Bounds at start of resize gesture */
  startBounds: TBounds
  /** Current pointer position in WORLD coordinates */
  worldX: number
  worldY: number
  /** Start pointer position in WORLD coordinates */
  startWorldX: number
  startWorldY: number
  shiftKey: boolean
}

/** Dimensions */
export type TDimensions = { w: number; h: number }

// ─────────────────────────────────────────────────────────────
// ACTIONABLE INTERFACE
// ─────────────────────────────────────────────────────────────

/**
 * Interface for objects that can receive and process actions.
 * Actions are dispatched to transformables, which apply them and return changes.
 */
export interface IActionable {
  /** Actions this transformable supports */
  readonly supportedActions: ReadonlySet<TActionType>

  /** Check if an action can be applied */
  canApply(action: TAction): boolean

  /**
   * Apply an action to this transformable.
   * - Updates visuals immediately
   * - Updates local element data
   * - Returns changes for CRDT persistence
   *
   * @returns TChanges if action was applied, null if not applicable
   */
  dispatch(action: TAction): TChanges | null

  captureSnapshot(): TSnapshot
  restoreSnapshot(snapshot: TSnapshot): TChanges
}

// ─────────────────────────────────────────────────────────────
// TRANSFORMABLE INTERFACE
// ─────────────────────────────────────────────────────────────

/**
 * Any object that can be transformed (translated, rotated, resized)
 * by TransformBox or MultiTransformBox.
 *
 * All transforms go through dispatch(action) which returns TChanges for CRDT.
 */
export interface ITransformable extends ISelectable, IActionable {
  // ─────────────────────────────────────────────────────────────
  // IDENTITY (readonly)
  // ─────────────────────────────────────────────────────────────
  readonly id: string

  /**
   * Bounds in WORLD coordinates.
   * Accounts for rotation (returns AABB of rotated shape).
   * Used for: hit testing, group bounds computation, spatial queries.
   */
  readonly worldBounds: Bounds

  /**
   * Bounding box in LOCAL coordinates (shape's own space).
   * Does NOT account for rotation (returns shape's natural bounds).
   * Used for: drawing transform box frame, computing pivot.
   */
  readonly localBounds: Bounds

  // ─────────────────────────────────────────────────────────────
  // TRANSFORM STATE (readonly - mutations via dispatch)
  // ─────────────────────────────────────────────────────────────

  /**
   * Current rotation in radians.
   */
  readonly rotation: number

  /**
   * Position in WORLD coordinates.
   * This is the shape's anchor point (typically center after pivot).
   */
  readonly worldPosition: Point

  /**
   * Pivot point in WORLD coordinates.
   * Computed from local pivot + world position + rotation.
   * Used by MultiTransformBox to rotate shapes around group center.
   */
  readonly worldPivot: Point

  /**
   * Pivot point in LOCAL coordinates.
   * Default: center of local bounds { x: w/2, y: h/2 }
   *
   * This is where rotation happens. For most shapes, it's the center.
   * For special cases (e.g., line rotating around one endpoint),
   * the shape can override this.
   */
  readonly localPivot: Point

  /**
   * Logical dimensions of the shape.
   * For rect: { w, h }
   * For ellipse: { w: rx*2, h: ry*2 }
   * For shapes without dimensions (pen/line): returns bounding box size
   */
  readonly dimensions: TDimensions

  // ─────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────

  /**
   * Redraw visuals from current state.
   */
  redraw(): void

  /**
   * Clean up resources.
   */
  destroy(): void
}
