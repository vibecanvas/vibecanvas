import { Graphics } from "pixi.js"
import type { TArrowData, TElementStyle, TPoint2D } from "@vibecanvas/shell/automerge/index"

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const CAP_SIZE = 12   // Size of arrow head
const DOT_RADIUS = 4  // Radius for dot cap

// ─────────────────────────────────────────────────────────────
// Cap Drawing
// ─────────────────────────────────────────────────────────────

type TCapType = TArrowData['startCap']

/**
 * Draw a cap graphic at a specific position with rotation.
 * The cap is drawn pointing in the direction of the angle.
 */
function drawCapGraphic(
  g: Graphics,
  capType: TCapType,
  color: string
): void {
  g.clear()
  if (capType === 'none') return

  switch (capType) {
    case 'arrow':
      // Triangle centered at origin (will be rotated by angle)
      g.poly([
        CAP_SIZE / 2, 0,              // tip
        -CAP_SIZE / 2, -CAP_SIZE / 2, // top-left
        -CAP_SIZE / 2, CAP_SIZE / 2,  // bottom-left
      ], false)
      g.fill({ color })
      break

    case 'dot':
      // Circle centered at origin
      g.circle(0, 0, DOT_RADIUS)
      g.fill({ color })
      break

    case 'diamond':
      // Diamond centered at origin
      g.poly([
        CAP_SIZE / 2, 0,    // right point
        0, -CAP_SIZE / 2,   // top
        -CAP_SIZE / 2, 0,   // left point
        0, CAP_SIZE / 2,    // bottom
      ], false)
      g.fill({ color })
      break
  }
}

/**
 * Calculate the angle at the start of the line (pointing away from the line).
 * The start cap should point away from the first segment direction.
 */
function getStartAngle(points: TPoint2D[]): number {
  if (points.length < 2) return 0

  // Direction from first point to second point
  const [x0, y0] = points[0]
  const [x1, y1] = points[1]
  const lineAngle = Math.atan2(y1 - y0, x1 - x0)
  // Start cap points OPPOSITE to line direction
  return lineAngle + Math.PI
}

/**
 * Calculate the angle at the end of the line (pointing along the line).
 * The end cap should point in the direction the last segment is going.
 */
function getEndAngle(points: TPoint2D[]): number {
  if (points.length < 2) return 0

  // Direction from second-to-last point to last point
  const [prevX, prevY] = points[points.length - 2]
  const [endX, endY] = points[points.length - 1]
  return Math.atan2(endY - prevY, endX - prevX)
}

/**
 * Get the position of the end point (last point in array).
 */
function getEndPosition(points: TPoint2D[]): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 }

  const [x, y] = points[points.length - 1]
  return { x, y }
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Draw the start cap graphic for an arrow element.
 */
export function drawStartCap(args: {
  graphics: Graphics
  capType: TCapType
  points: TPoint2D[]
  style: TElementStyle
  offset: { x: number; y: number }
}): void {
  const { graphics, capType, points, style, offset } = args

  if (capType === 'none') {
    graphics.clear()
    graphics.visible = false
    return
  }

  const color = style.strokeColor ?? '#000000'
  const angle = getStartAngle(points)

  drawCapGraphic(graphics, capType, color)

  // Position at start (0, 0) in line space, offset for container
  graphics.x = offset.x
  graphics.y = offset.y
  graphics.rotation = angle
  graphics.visible = true
}

/**
 * Draw the end cap graphic for an arrow element.
 */
export function drawEndCap(args: {
  graphics: Graphics
  capType: TCapType
  points: TPoint2D[]
  style: TElementStyle
  offset: { x: number; y: number }
}): void {
  const { graphics, capType, points, style, offset } = args

  if (capType === 'none') {
    graphics.clear()
    graphics.visible = false
    return
  }

  const color = style.strokeColor ?? '#000000'
  const angle = getEndAngle(points)
  const endPos = getEndPosition(points)

  drawCapGraphic(graphics, capType, color)

  // Position at end point in line space, offset for container
  graphics.x = endPos.x + offset.x
  graphics.y = endPos.y + offset.y
  graphics.rotation = angle
  graphics.visible = true
}
