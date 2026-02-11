import type { TBackendElementOf } from "../../element.abstract"
import type { TPoint2D } from "@vibecanvas/shell/automerge/index"

export type TMidpoint = {
  x: number
  y: number
  pointIndex: number  // Index of the segment (between points[i] and points[i+1])
}

/**
 * Calculate midpoint positions for a line element.
 * Midpoints are placed at the center of each line segment.
 *
 * For a line with N points, there are N-1 midpoints:
 * - Midpoint 0: between points[0] and points[1]
 * - Midpoint 1: between points[1] and points[2]
 * - etc.
 *
 * Positions are in local coordinates (relative to element position).
 */
export function computeMidpoints(element: TBackendElementOf<"line">): TMidpoint[] {
  const points = element.data.points
  const midpoints: TMidpoint[] = []

  if (points.length < 2) return midpoints

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    midpoints.push({
      x: (p1[0] + p2[0]) / 2,
      y: (p1[1] + p2[1]) / 2,
      pointIndex: i,
    })
  }

  return midpoints
}

/**
 * Insert a new point at the given midpoint position.
 * Returns a new points array with the new point inserted.
 *
 * @param points Current points array
 * @param midpointIndex Index of the midpoint (segment index)
 * @param newX X coordinate of new point
 * @param newY Y coordinate of new point
 * @returns New points array with the point inserted
 */
export function insertPointAtMidpoint(
  points: TPoint2D[],
  midpointIndex: number,
  newX: number,
  newY: number
): TPoint2D[] {
  const newPoints: TPoint2D[] = [
    ...points.slice(0, midpointIndex + 1),
    [newX, newY],
    ...points.slice(midpointIndex + 1)
  ]
  return newPoints
}
