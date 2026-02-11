import { Bounds, Point, Rectangle } from "pixi.js"
import type { THandle } from "../transformable.interface"

export type TScaleResult = {
  scale: number
  fixedPoint: Point
}

export type TDashedLineSegment = {
  startX: number
  startY: number
  endX: number
  endY: number
}

export function computeBoundingBox(bounds: Bounds[]): Bounds {
  if (bounds.length === 0) {
    return new Bounds()
  }

  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity

  for (const bound of bounds) {
    minX = Math.min(minX, bound.x)
    minY = Math.min(minY, bound.y)
    maxX = Math.max(maxX, bound.x + bound.width)
    maxY = Math.max(maxY, bound.y + bound.height)
  }

  return new Bounds(minX, minY, maxX, maxY)
}

export function calculateDashedLineSegments(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dashLength: number,
  dashGap: number
): TDashedLineSegment[] {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.sqrt(dx * dx + dy * dy)
  const dashCount = Math.floor(length / (dashLength + dashGap))
  const ux = dx / length
  const uy = dy / length

  const segments: TDashedLineSegment[] = []
  let currentX = x1
  let currentY = y1

  for (let i = 0; i < dashCount; i++) {
    segments.push({
      startX: currentX,
      startY: currentY,
      endX: currentX + ux * dashLength,
      endY: currentY + uy * dashLength,
    })

    currentX += ux * (dashLength + dashGap)
    currentY += uy * (dashLength + dashGap)
  }

  return segments
}

export function calculateScaleAndFixedPoint(
  handle: THandle,
  bounds: Rectangle,
  deltaX: number,
  deltaY: number
): TScaleResult {
  const b = bounds
  let fixedPoint: Point
  let newW = b.width
  let newH = b.height

  switch (handle) {
    case 'se':
      fixedPoint = new Point(b.x, b.y)
      newW = b.width + deltaX
      newH = b.height + deltaY
      break
    case 'sw':
      fixedPoint = new Point(b.x + b.width, b.y)
      newW = b.width - deltaX
      newH = b.height + deltaY
      break
    case 'ne':
      fixedPoint = new Point(b.x, b.y + b.height)
      newW = b.width + deltaX
      newH = b.height - deltaY
      break
    case 'nw':
      fixedPoint = new Point(b.x + b.width, b.y + b.height)
      newW = b.width - deltaX
      newH = b.height - deltaY
      break
    case 'n':
      fixedPoint = new Point(b.x + b.width / 2, b.y + b.height)
      newH = b.height - deltaY
      break
    case 's':
      fixedPoint = new Point(b.x + b.width / 2, b.y)
      newH = b.height + deltaY
      break
    case 'e':
      fixedPoint = new Point(b.x, b.y + b.height / 2)
      newW = b.width + deltaX
      break
    case 'w':
      fixedPoint = new Point(b.x + b.width, b.y + b.height / 2)
      newW = b.width - deltaX
      break
    default:
      fixedPoint = new Point(b.x, b.y)
  }

  // Uniform scale (preserve aspect ratio) - use the smaller scale factor
  const scaleX = Math.max(0.01, newW / b.width)
  const scaleY = Math.max(0.01, newH / b.height)
  const scale = Math.min(scaleX, scaleY)

  return { scale, fixedPoint }
}

export function rotatePointAroundCenter(
  px: number,
  py: number,
  cx: number,
  cy: number,
  angle: number
): Point {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const offsetX = px - cx
  const offsetY = py - cy

  return new Point(cx + offsetX * cos - offsetY * sin, cy + offsetX * sin + offsetY * cos)
}

export function snapAngleTo15Degrees(angle: number): number {
  const snapAngle = Math.PI / 12  // 15 degrees in radians
  return Math.round(angle / snapAngle) * snapAngle
}

export function calculateRotationDelta(
  currentAngle: number,
  startAngle: number,
  shiftKey: boolean
): number {
  let deltaAngle = currentAngle - startAngle

  if (shiftKey) {
    deltaAngle = snapAngleTo15Degrees(deltaAngle)
  }

  return deltaAngle
}

export function scalePosition(
  x: number,
  y: number,
  fixedPoint: Point,
  scale: number
): Point {
  const offsetX = x - fixedPoint.x
  const offsetY = y - fixedPoint.y
    return new Point(fixedPoint.x + offsetX * scale, fixedPoint.y + offsetY * scale)
}

export function getBoundsCenter(bounds: Bounds): Point {
  return new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
}
