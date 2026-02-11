import type { TBackendElementOf } from "../../element.abstract"
import { Bounds, Graphics, Point } from "pixi.js"

/**
 * Minimum hit area padding to ensure thin lines are clickable.
 */
export const MIN_HIT_PADDING = 10

/**
 * Padding for anchor points extending beyond line bounds.
 * ANCHOR_RADIUS (5) + ANCHOR_STROKE_WIDTH (1) = 6
 */
export const ANCHOR_PADDING = 6

/**
 * Get the world position (geometric center) of a line element.
 *
 * This is the rotation center - calculated as the average of all anchor points,
 * transformed to world space. Unlike rectangles where center = element position,
 * lines rotate around the center of all their anchor points.
 */
export function getWorldPosition(element: TBackendElementOf<'line'>): Point {
  const points = element.data.points
  const angle = element.angle
  const originX = element.x
  const originY = element.y
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  // Calculate geometric center in local space (average of all points)
  let sumX = 0
  let sumY = 0

  for (const [x, y] of points) {
    sumX += x
    sumY += y
  }

  const localCenterX = sumX / points.length
  const localCenterY = sumY / points.length

  // Transform to world space
  const worldCenterX = localCenterX * cos - localCenterY * sin + originX
  const worldCenterY = localCenterX * sin + localCenterY * cos + originY

  return new Point(worldCenterX, worldCenterY)
}

/**
 * Get the world bounds (axis-aligned bounding box) of a line element.
 *
 * Computed from actual anchor points transformed to world space,
 * with padding for anchor point radius extending beyond the line.
 */
export function getWorldBounds(element: TBackendElementOf<'line'>): Bounds {
  const points = element.data.points
  const angle = element.angle
  const originX = element.x
  const originY = element.y
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  // Transform points to world space and compute AABB
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity

  for (const [lx, ly] of points) {
    // Rotate around origin, then translate to world position
    const worldX = lx * cos - ly * sin + originX
    const worldY = lx * sin + ly * cos + originY

    minX = Math.min(minX, worldX)
    minY = Math.min(minY, worldY)
    maxX = Math.max(maxX, worldX)
    maxY = Math.max(maxY, worldY)
  }

  // Add padding for anchor point radius
  minX -= ANCHOR_PADDING
  minY -= ANCHOR_PADDING
  maxX += ANCHOR_PADDING
  maxY += ANCHOR_PADDING

  // Bounds constructor: (minX, minY, maxX, maxY)
  return new Bounds(minX, minY, maxX, maxY)
}

/**
 * Calculate expansion offset for centering line within expanded bounds.
 *
 * Used to position the container and offset graphics so that:
 * 1. Thin lines have a minimum clickable area (MIN_HIT_PADDING)
 * 2. Anchor points don't get clipped (ANCHOR_PADDING)
 *
 * @returns Object with offset values and expanded dimensions
 */
export function getExpansionOffset(graphics: Graphics): {
  x: number
  y: number
  width: number
  height: number
} {
  const graphicsBounds = graphics.getLocalBounds()
  const minSize = MIN_HIT_PADDING * 2

  // Expand for both hit area (minSize) and anchor points
  const expandX = Math.max(ANCHOR_PADDING, (minSize - graphicsBounds.width) / 2)
  const expandY = Math.max(ANCHOR_PADDING, (minSize - graphicsBounds.height) / 2)

  return {
    x: expandX,
    y: expandY,
    width: graphicsBounds.width + expandX * 2,
    height: graphicsBounds.height + expandY * 2,
  }
}
