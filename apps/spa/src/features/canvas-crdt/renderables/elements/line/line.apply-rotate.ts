import type { TRotateAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import { Change } from "@/features/canvas-crdt/types/changes"
import type { TLineApplyContext } from "./line.apply-context"

/**
 * Apply rotation around the geometric center of the line.
 *
 * Since the container pivot is at the start point (for stable anchor editing),
 * we need to translate element.x/y when rotating so the center stays fixed.
 */
export function applyRotate(ctx: TLineApplyContext, action: TRotateAction): TChanges {
  const points = ctx.element.data.points
  const oldAngle = ctx.element.angle
  const newAngle = action.angle

  // Calculate local center (average of all anchor points)
  let sumX = 0
  let sumY = 0

  for (const [x, y] of points) {
    sumX += x
    sumY += y
  }

  const localCenterX = sumX / points.length
  const localCenterY = sumY / points.length

  // Calculate where the center was in world space (before rotation change)
  const cosOld = Math.cos(oldAngle)
  const sinOld = Math.sin(oldAngle)
  const oldWorldCenterX = localCenterX * cosOld - localCenterY * sinOld + ctx.element.x
  const oldWorldCenterY = localCenterX * sinOld + localCenterY * cosOld + ctx.element.y

  // Calculate where the center would be with new angle (without translating)
  const cosNew = Math.cos(newAngle)
  const sinNew = Math.sin(newAngle)
  const newWorldCenterX = localCenterX * cosNew - localCenterY * sinNew + ctx.element.x
  const newWorldCenterY = localCenterX * sinNew + localCenterY * cosNew + ctx.element.y

  // Translate start point to keep center stationary
  ctx.element.x += oldWorldCenterX - newWorldCenterX
  ctx.element.y += oldWorldCenterY - newWorldCenterY
  ctx.element.angle = newAngle

  ctx.redraw()

  return {
    action,
    targetId: ctx.id,
    timestamp: Date.now(),
    changes: [
      Change.crdt(['elements', ctx.id, 'x'], ctx.element.x),
      Change.crdt(['elements', ctx.id, 'y'], ctx.element.y),
      Change.crdt(['elements', ctx.id, 'angle'], ctx.element.angle),
    ],
  }
}
