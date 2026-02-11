import { Color, Graphics } from "pixi.js"
import type { TBackendElementOf } from "../../element.abstract"
import type { TPoint2D } from "@vibecanvas/shell/automerge/index"

/**
 * Draw a line element.
 * Points are in local coordinates (relative to element position).
 * First point is always [0, 0] in local space.
 */
export function drawLine(args: { lineGraphics: Graphics, element: TBackendElementOf<"line"> }): void {
  const { data, style } = args.element
  const g = args.lineGraphics
  const points = data.points

  g.clear()

  if (points.length < 2) return

  // Set stroke style
  g.setStrokeStyle({
    color: style.strokeColor ?? '#000000',
    width: style.strokeWidth ?? 2,
  })

  // Start at first point
  g.moveTo(points[0][0], points[0][1])

  // Draw based on line type
  switch (data.lineType) {
    case 'straight':
      renderStraight(g, points)
      break
    case 'curved':
      renderCurved(g, points)
      break
  }

  g.stroke()
}

/**
 * Render straight line segments.
 * Simply connects points with lineTo().
 */
function renderStraight(g: Graphics, points: TPoint2D[]): void {
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i][0], points[i][1])
  }
}

/**
 * Render curved line using cubic bezier curves.
 * Control points are auto-computed using Catmull-Rom → Bezier conversion.
 *
 * For each segment from P1 to P2, given neighboring points P0 and P3:
 *   CP1 = P1 + (P2 - P0) / 6
 *   CP2 = P2 - (P3 - P1) / 6
 */
function renderCurved(g: Graphics, points: TPoint2D[]): void {
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]       // previous (or current if first)
    const p1 = points[i]                         // start of segment
    const p2 = points[i + 1]                     // end of segment
    const p3 = points[i + 2] ?? points[i + 1]   // next (or end if last)

    // Catmull-Rom to Bezier conversion
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6

    g.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1])
  }
}

// ─────────────────────────────────────────────────────────────
// Anchor Points
// ─────────────────────────────────────────────────────────────

const ANCHOR_RADIUS = 5
const ANCHOR_STROKE_WIDTH = 1
const ANCHOR_STROKE_COLOR = 'black'
const ANCHOR_FILL_COLOR = new Color([0.992, 0.960, 0.902, 0.5])


/**
 * Draw anchor points for a line element.
 * Manages a pool of Graphics objects - creates new ones if needed,
 * reuses existing ones by repositioning, and destroys extras.
 *
 * Anchor points are at each point in the points array.
 */
export function drawAnchorPoints(args: {
  pool: Graphics[]
  element: TBackendElementOf<"line">
  graphicsOffset: { x: number; y: number }
}): void {
  const { pool, element, graphicsOffset } = args
  const points = element.data.points

  // Anchors at each point position
  const positions = points.map(([x, y]) => ({ x, y }))

  const requiredCount = positions.length

  // Create new Graphics if pool is too small
  while (pool.length < requiredCount) {
    const g = new Graphics()
    drawAnchorGraphic(g)
    pool.push(g)
  }

  // Destroy excess Graphics if pool is too large
  while (pool.length > requiredCount) {
    const g = pool.pop()!
    g.destroy()
  }

  // Position each anchor point
  for (let i = 0; i < requiredCount; i++) {
    const g = pool[i]
    const pos = positions[i]
    // Apply graphics offset so anchors align with the line
    g.x = pos.x + graphicsOffset.x
    g.y = pos.y + graphicsOffset.y
  }
}

/**
 * Draw the anchor point graphic (hollow circle).
 */
function drawAnchorGraphic(g: Graphics): void {
  g.clear()
  g.circle(0, 0, ANCHOR_RADIUS)
  g.fill({ color: ANCHOR_FILL_COLOR })
  g.stroke({ color: ANCHOR_STROKE_COLOR, width: ANCHOR_STROKE_WIDTH })
}

// ─────────────────────────────────────────────────────────────
// Midpoints
// ─────────────────────────────────────────────────────────────

const MIDPOINT_RADIUS = 3
const MIDPOINT_STROKE_WIDTH = 1
const MIDPOINT_STROKE_COLOR = 'black'
const MIDPOINT_FILL_COLOR = new Color([0.8, 0.8, 0.8, 1])

/**
 * Draw midpoints for a line element.
 * Manages a pool of Graphics objects - creates new ones if needed,
 * reuses existing ones by repositioning, and destroys extras.
 *
 * Midpoints sit on the actual line/curve at t=0.5 of each segment.
 * Dragging a midpoint inserts a new anchor point.
 */
export function drawMidpoints(args: {
  pool: Graphics[]
  element: TBackendElementOf<"line">
  graphicsOffset: { x: number; y: number }
}): void {
  const { pool, element, graphicsOffset } = args
  const midpoints = computeMidpointsFromPoints(element.data.points, element.data.lineType)

  const requiredCount = midpoints.length

  // Create new Graphics if pool is too small
  while (pool.length < requiredCount) {
    const g = new Graphics()
    drawMidpointGraphic(g)
    pool.push(g)
  }

  // Destroy excess Graphics if pool is too large
  while (pool.length > requiredCount) {
    const g = pool.pop()!
    g.destroy()
  }

  // Position each midpoint
  for (let i = 0; i < requiredCount; i++) {
    const g = pool[i]
    const mid = midpoints[i]
    // Apply graphics offset so midpoints align with the line
    g.x = mid.x + graphicsOffset.x
    g.y = mid.y + graphicsOffset.y
  }
}

/**
 * Draw the midpoint graphic (small filled circle).
 */
function drawMidpointGraphic(g: Graphics): void {
  g.clear()
  g.circle(0, 0, MIDPOINT_RADIUS)
  g.fill({ color: MIDPOINT_FILL_COLOR })
  g.stroke({ color: MIDPOINT_STROKE_COLOR, width: MIDPOINT_STROKE_WIDTH })
}

/**
 * Compute midpoint positions from points array.
 * For straight lines: geometric midpoint between adjacent points.
 * For curved lines: actual point on bezier curve at t=0.5.
 */
function computeMidpointsFromPoints(
  points: TPoint2D[],
  lineType: 'straight' | 'curved'
): { x: number; y: number }[] {
  const midpoints: { x: number; y: number }[] = []

  for (let i = 0; i < points.length - 1; i++) {
    if (lineType === 'straight') {
      // Simple geometric midpoint for straight lines
      midpoints.push({
        x: (points[i][0] + points[i + 1][0]) / 2,
        y: (points[i][1] + points[i + 1][1]) / 2,
      })
    } else {
      // Compute actual point on bezier curve at t=0.5
      // Uses same Catmull-Rom → Bezier conversion as renderCurved()
      const p0 = points[i - 1] ?? points[i]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[i + 2] ?? points[i + 1]

      // Control points (Catmull-Rom to Bezier)
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6

      // Cubic bezier at t=0.5: B(0.5) = (1/8)*P1 + (3/8)*CP1 + (3/8)*CP2 + (1/8)*P2
      midpoints.push({
        x: 0.125 * p1[0] + 0.375 * cp1x + 0.375 * cp2x + 0.125 * p2[0],
        y: 0.125 * p1[1] + 0.375 * cp1y + 0.375 * cp2y + 0.125 * p2[1],
      })
    }
  }

  return midpoints
}
