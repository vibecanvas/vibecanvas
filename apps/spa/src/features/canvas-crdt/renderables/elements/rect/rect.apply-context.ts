import type { TElement } from "@vibecanvas/shell/automerge/index"
import type { Container } from "pixi.js"
import type { Canvas } from "@/features/canvas-crdt/canvas/canvas"
import type { TransformBox } from "../../transform-box/transform-box"
import type { TResizeContext } from "../../transformable.interface"

// Realistic bounds for canvas elements
export const BOUNDS = {
  MIN_X: -100_000,
  MAX_X: 100_000,
  MIN_Y: -100_000,
  MAX_Y: 100_000,
  MIN_SIZE: 1,
  MAX_SIZE: 50_000,
} as const

export const clamp = (val: number, min: number, max: number) => Math.round(Math.max(min, Math.min(max, val)))
export const clampX = (x: number) => clamp(x, BOUNDS.MIN_X, BOUNDS.MAX_X)
export const clampY = (y: number) => clamp(y, BOUNDS.MIN_Y, BOUNDS.MAX_Y)
export const clampSize = (s: number) => clamp(s, BOUNDS.MIN_SIZE, BOUNDS.MAX_SIZE)

/**
 * Context object passed to apply functions.
 * Contains all the dependencies needed to update visuals and return CRDT changes.
 *
 * Element types that use w/h (rect, diamond, image) share the same apply functions.
 * Ellipse (rx/ry) and line (segments) have their own implementations.
 */
export type TApplyContext<TData = { w: number; h: number }> = {
  /** The element data (mutable during apply) */
  element: TElement & { data: TData }
  /** Element ID */
  id: string
  /** PixiJS container for visual updates */
  container: Container
  /** Transform box for selection handles (nullable) */
  transformBox: TransformBox | null
  /** Canvas instance for operations like removeElement */
  canvas: Canvas
  /** Redraw function to update visuals after mutation */
  redraw: () => void
  /** Get local bounds (used for position calculations) */
  localBounds: { width: number; height: number }
  /** Getter/setter for selection state */
  isSelected: boolean
  setIsSelected: (value: boolean) => void
  /** setResize function for resize action (shape-specific) */
  setResize?: (ctx: TResizeContext) => void
}

/** Context for WH-based elements (rect, diamond, image) */
export type TApplyContextWH = TApplyContext<{ type: string; w: number; h: number }>

/** Context for radius-based elements (ellipse) */
export type TApplyContextRadius = TApplyContext<{ type: 'ellipse'; rx: number; ry: number }>
