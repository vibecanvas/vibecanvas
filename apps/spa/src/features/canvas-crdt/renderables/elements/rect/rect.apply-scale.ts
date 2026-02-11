import type { TScaleAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import { Change } from "@/features/canvas-crdt/types/changes"
import { clampX, clampY, clampSize, type TApplyContextWH } from "./rect.apply-context"

/**
 * Apply scale action to an element with w/h dimensions.
 * Scales dimensions and repositions relative to center point.
 *
 * Used by: rect, diamond, image
 * Ellipse has unique implementation (rx/ry).
 * Line and text do not support scale.
 */
export function applyScale(ctx: TApplyContextWH, action: TScaleAction): TChanges {
  const { factor, center, initialBounds } = action

  // Calculate initial center from initialBounds (NOT current position)
  const initialCenterX = initialBounds.x + initialBounds.w / 2
  const initialCenterY = initialBounds.y + initialBounds.h / 2

  // Scale position relative to the fixed center point (from initial position)
  const newCenterX = center.x + (initialCenterX - center.x) * factor
  const newCenterY = center.y + (initialCenterY - center.y) * factor

  // Scale dimensions from initial bounds (NOT current dimensions)
  const newW = clampSize(initialBounds.w * factor)
  const newH = clampSize(initialBounds.h * factor)

  // Update element data (top-left position)
  ctx.element.x = clampX(newCenterX - newW / 2)
  ctx.element.y = clampY(newCenterY - newH / 2)
  ctx.element.data.w = newW
  ctx.element.data.h = newH

  // Update container position
  ctx.container.x = clampX(newCenterX)
  ctx.container.y = clampY(newCenterY)

  ctx.redraw()

  return {
    action,
    targetId: ctx.id,
    timestamp: Date.now(),
    changes: [
      Change.crdt(['elements', ctx.id, 'x'], ctx.element.x),
      Change.crdt(['elements', ctx.id, 'y'], ctx.element.y),
      Change.crdt(['elements', ctx.id, 'data', 'w'], ctx.element.data.w),
      Change.crdt(['elements', ctx.id, 'data', 'h'], ctx.element.data.h),
    ],
  }
}
