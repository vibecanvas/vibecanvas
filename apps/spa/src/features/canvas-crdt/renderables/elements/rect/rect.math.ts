import { TBounds, TResizeContext } from "../../transformable.interface"

// Re-export for backwards compatibility
export type { TBounds } from "../../transformable.interface"

export function calculateResizeDelta(ctx: TResizeContext): { deltaX: number; deltaY: number } {
  return {
    deltaX: ctx.worldX - ctx.startWorldX,
    deltaY: ctx.worldY - ctx.startWorldY,
  }
}

export function applyHandleDelta(
  bounds: TBounds,
  handle: string,
  deltaX: number,
  deltaY: number
): TBounds {
  let { x, y, w, h } = bounds

  switch (handle) {
    case 'n':
      y += deltaY; h -= deltaY
      break
    case 's':
      h += deltaY
      break
    case 'e':
      w += deltaX
      break
    case 'w':
      x += deltaX; w -= deltaX
      break
    case 'nw':
      x += deltaX; y += deltaY; w -= deltaX; h -= deltaY
      break
    case 'ne':
      y += deltaY; w += deltaX; h -= deltaY
      break
    case 'sw':
      x += deltaX; w -= deltaX; h += deltaY
      break
    case 'se':
      w += deltaX; h += deltaY
      break
  }

  return { x, y, w, h }
}

export function isCornerHandle(handle: string): boolean {
  return ['nw', 'ne', 'sw', 'se'].includes(handle)
}

/**
 * Get the fixed anchor offset from center in local space.
 * The fixed anchor is the opposite corner/edge from the dragged handle.
 * Returns offset from center: { x: ±w/2, y: ±h/2 } for corners,
 * or edge midpoints for edge handles.
 */
export function getFixedAnchorOffset(handle: string, w: number, h: number): { x: number; y: number } {
  switch (handle) {
    case 'se': return { x: -w / 2, y: -h / 2 }  // NW corner is fixed
    case 'sw': return { x: w / 2, y: -h / 2 }   // NE corner is fixed
    case 'ne': return { x: -w / 2, y: h / 2 }   // SW corner is fixed
    case 'nw': return { x: w / 2, y: h / 2 }    // SE corner is fixed
    case 'n':  return { x: 0, y: h / 2 }        // S edge midpoint is fixed
    case 's':  return { x: 0, y: -h / 2 }       // N edge midpoint is fixed
    case 'e':  return { x: -w / 2, y: 0 }       // W edge midpoint is fixed
    case 'w':  return { x: w / 2, y: 0 }        // E edge midpoint is fixed
    default:   return { x: 0, y: 0 }
  }
}

export function preserveAspectRatio(
  bounds: TBounds,
  startBounds: TBounds,
  handle: string
): TBounds {
  const aspectRatio = startBounds.w / startBounds.h
  let { x, y, w, h } = bounds

  const widthChange = Math.abs(w - startBounds.w) / startBounds.w
  const heightChange = Math.abs(h - startBounds.h) / startBounds.h

  if (widthChange >= heightChange) {
    const newH = Math.abs(w) / aspectRatio
    const heightDelta = newH - Math.abs(h)

    if (handle === 'nw' || handle === 'ne') {
      y -= heightDelta * Math.sign(h)
    }
    h = Math.sign(h) * newH || newH
  } else {
    const newW = Math.abs(h) * aspectRatio
    const widthDelta = newW - Math.abs(w)

    if (handle === 'nw' || handle === 'sw') {
      x -= widthDelta * Math.sign(w)
    }
    w = Math.sign(w) * newW || newW
  }

  return { x, y, w, h }
}

export function normalizeNegativeBounds(bounds: TBounds): TBounds {
  let { x, y, w, h } = bounds

  if (w < 0) { x += w; w = Math.abs(w) }
  if (h < 0) { y += h; h = Math.abs(h) }

  return { x, y, w, h }
}

export function applyMinimumSize(bounds: TBounds, minSize: number = 1): TBounds {
  return {
    ...bounds,
    w: Math.max(minSize, bounds.w),
    h: Math.max(minSize, bounds.h),
  }
}

export function calculateResizedBounds(
  ctx: TResizeContext,
  startBounds: TBounds
): TBounds {
  const { deltaX, deltaY } = calculateResizeDelta(ctx)

  let bounds = applyHandleDelta(startBounds, ctx.handle, deltaX, deltaY)

  if (ctx.shiftKey && isCornerHandle(ctx.handle) && startBounds.w > 0 && startBounds.h > 0) {
    bounds = preserveAspectRatio(bounds, startBounds, ctx.handle)
  }

  bounds = normalizeNegativeBounds(bounds)
  bounds = applyMinimumSize(bounds)

  return bounds
}

export function snapRotationTo15Degrees(rotation: number): number {
  const snapAngle = Math.PI / 12  // 15 degrees in radians
  return Math.round(rotation / snapAngle) * snapAngle
}

export function calculateRotation(
  startContainerAngle: number,
  currentAngle: number,
  startAngle: number,
  shiftKey: boolean
): number {
  let newRotation = startContainerAngle + (currentAngle - startAngle)

  if (shiftKey) {
    newRotation = snapRotationTo15Degrees(newRotation)
  }

  return newRotation
}

/**
 * Transform world-space delta to local-space delta, accounting for rotation.
 */
export function worldToLocalDelta(
  worldDX: number,
  worldDY: number,
  rotation: number
): { localDX: number; localDY: number } {
  const cosNeg = Math.cos(-rotation)
  const sinNeg = Math.sin(-rotation)
  return {
    localDX: worldDX * cosNeg - worldDY * sinNeg,
    localDY: worldDX * sinNeg + worldDY * cosNeg,
  }
}

/**
 * Calculate new element bounds after a resize operation.
 * Handles rotation-aware resize with fixed anchor preservation.
 *
 * @returns New element position (x, y) and dimensions (w, h)
 */
export function calculateRotatedResize(
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
