import type { TScaleAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import { Change } from "@/features/canvas-crdt/types/changes"
import { BOUNDS, clamp, clampX, clampY, type TApplyContextRadius } from "../rect/rect.apply-context"

/**
 * Clamp radius value within valid bounds.
 * Min radius = MIN_SIZE/2 to ensure minimum diameter of MIN_SIZE.
 * Max radius = MAX_SIZE/2 to ensure maximum diameter of MAX_SIZE.
 */
export const clampRadius = (r: number) => clamp(r, BOUNDS.MIN_SIZE / 2, BOUNDS.MAX_SIZE / 2)

/**
 * Apply scale action to an ellipse element using rx/ry.
 * Scales radii and repositions relative to center point.
 *
 * Unique to ellipse - uses rx/ry instead of w/h.
 */
export function applyScale(ctx: TApplyContextRadius, action: TScaleAction): TChanges {
  const { factor, center, initialBounds } = action

  // Calculate initial center from initialBounds (NOT current position)
  const initialCenterX = initialBounds.x + initialBounds.w / 2
  const initialCenterY = initialBounds.y + initialBounds.h / 2

  // Scale position relative to the fixed center point (from initial position)
  const newCenterX = center.x + (initialCenterX - center.x) * factor
  const newCenterY = center.y + (initialCenterY - center.y) * factor

  // Scale radii (initialBounds.w = 2*rx, initialBounds.h = 2*ry)
  const newRx = clampRadius((initialBounds.w / 2) * factor)
  const newRy = clampRadius((initialBounds.h / 2) * factor)

  // Update element data (top-left position)
  ctx.element.x = clampX(newCenterX - newRx)
  ctx.element.y = clampY(newCenterY - newRy)
  ctx.element.data.rx = newRx
  ctx.element.data.ry = newRy

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
      Change.crdt(['elements', ctx.id, 'data', 'rx'], ctx.element.data.rx),
      Change.crdt(['elements', ctx.id, 'data', 'ry'], ctx.element.data.ry),
    ],
  }
}
