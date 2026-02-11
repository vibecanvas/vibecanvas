import { Rectangle } from "pixi.js"

/**
 * Compute the axis-aligned bounding box (AABB) for a rotated rectangle.
 * When a shape is rotated, its AABB expands to contain all rotated corners.
 */
export function computeRotatedAABB(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  rotation: number
): Rectangle {
  // Optimization: if no rotation, skip the trig
  if (rotation === 0) {
    return new Rectangle(
      centerX - width / 2,
      centerY - height / 2,
      width,
      height
    )
  }

  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const halfW = width / 2
  const halfH = height / 2

  // Compute rotated corners relative to center
  const corners = [
    { x: -halfW, y: -halfH },  // top-left
    { x:  halfW, y: -halfH },  // top-right
    { x:  halfW, y:  halfH },  // bottom-right
    { x: -halfW, y:  halfH },  // bottom-left
  ]

  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity

  for (const corner of corners) {
    // Rotate around center, then translate to world position
    const rx = corner.x * cos - corner.y * sin + centerX
    const ry = corner.x * sin + corner.y * cos + centerY

    minX = Math.min(minX, rx)
    minY = Math.min(minY, ry)
    maxX = Math.max(maxX, rx)
    maxY = Math.max(maxY, ry)
  }

  return new Rectangle(minX, minY, maxX - minX, maxY - minY)
}

/**
 * Compute the axis-aligned bounding box (AABB) from an array of points.
 * Used for line/arrow elements defined by vertices rather than width/height.
 *
 * @param points Array of [x, y] tuples
 * @returns Rectangle with { x, y, width, height } of the bounding box
 */
export function computeBoundsFromPoints(points: [number, number][]): Rectangle {
  if (points.length === 0) {
    return new Rectangle(0, 0, 0, 0)
  }

  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity

  for (const [x, y] of points) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  return new Rectangle(minX, minY, maxX - minX, maxY - minY)
}

/**
 * Compute the axis-aligned bounding box (AABB) from segment data.
 * Segments are [cpx, cpy, endX, endY] tuples. Start is always (0, 0).
 *
 * @param segments Array of quadratic segments
 * @returns Rectangle with { x, y, width, height } of the bounding box
 */
export function computeBoundsFromSegments(segments: [number, number, number, number][]): Rectangle {
  if (segments.length === 0) {
    return new Rectangle(0, 0, 0, 0)
  }

  // Start with the origin (start point of line)
  let minX = 0, minY = 0
  let maxX = 0, maxY = 0

  for (const [, , endX, endY] of segments) {
    minX = Math.min(minX, endX)
    minY = Math.min(minY, endY)
    maxX = Math.max(maxX, endX)
    maxY = Math.max(maxY, endY)
  }

  return new Rectangle(minX, minY, maxX - minX, maxY - minY)
}
