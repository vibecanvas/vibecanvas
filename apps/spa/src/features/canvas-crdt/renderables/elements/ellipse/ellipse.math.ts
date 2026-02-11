import { TBounds, TResizeContext } from "../../transformable.interface"
import {
  applyHandleDelta,
  isCornerHandle,
  preserveAspectRatio,
  normalizeNegativeBounds,
  applyMinimumSize,
  getFixedAnchorOffset,
  worldToLocalDelta,
} from "../rect/rect.math"

/**
 * Calculate new element bounds after a resize operation for ellipse.
 * Returns bounds in w/h format (caller converts to rx/ry).
 * Handles rotation-aware resize with fixed anchor preservation.
 */
export function calculateRotatedResizeForEllipse(
  ctx: TResizeContext,
  rotation: number
): TBounds {
  // Transform world delta to local delta (rotation-aware)
  const worldDX = ctx.worldX - ctx.startWorldX
  const worldDY = ctx.worldY - ctx.startWorldY
  const { localDX, localDY } = worldToLocalDelta(worldDX, worldDY, rotation)

  // Apply handle logic in local space
  let bounds = applyHandleDelta(ctx.startBounds, ctx.handle, localDX, localDY)

  // Shift = preserve aspect ratio
  if (ctx.shiftKey && isCornerHandle(ctx.handle) && ctx.startBounds.w > 0 && ctx.startBounds.h > 0) {
    bounds = preserveAspectRatio(bounds, ctx.startBounds, ctx.handle)
  }

  // Normalize and apply minimum size
  bounds = normalizeNegativeBounds(bounds)
  bounds = applyMinimumSize(bounds)

  // For rotated shapes, keep the fixed anchor in world space
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)

  // Get fixed anchor offset from center in local space (using start dimensions)
  const fixedAnchorLocal = getFixedAnchorOffset(ctx.handle, ctx.startBounds.w, ctx.startBounds.h)

  // Calculate fixed anchor position in world space
  const startCenterX = ctx.startBounds.x + ctx.startBounds.w / 2
  const startCenterY = ctx.startBounds.y + ctx.startBounds.h / 2
  const fixedAnchorWorldX = startCenterX + fixedAnchorLocal.x * cos - fixedAnchorLocal.y * sin
  const fixedAnchorWorldY = startCenterY + fixedAnchorLocal.x * sin + fixedAnchorLocal.y * cos

  // Get new fixed anchor offset from center (using new dimensions)
  const newFixedAnchorLocal = getFixedAnchorOffset(ctx.handle, bounds.w, bounds.h)

  // Calculate new center position to keep fixed anchor in place
  const newCenterX = fixedAnchorWorldX - (newFixedAnchorLocal.x * cos - newFixedAnchorLocal.y * sin)
  const newCenterY = fixedAnchorWorldY - (newFixedAnchorLocal.x * sin + newFixedAnchorLocal.y * cos)

  // Calculate new top-left from center
  return {
    x: newCenterX - bounds.w / 2,
    y: newCenterY - bounds.h / 2,
    w: bounds.w,
    h: bounds.h,
  }
}
