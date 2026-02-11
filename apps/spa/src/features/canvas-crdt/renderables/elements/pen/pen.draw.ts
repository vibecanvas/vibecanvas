import getStroke from 'perfect-freehand'
import polygonClipping from 'polygon-clipping'
import { Graphics } from 'pixi.js'
import type { TBackendElementOf } from '../../element.abstract'

/**
 * Convert stroke points to SVG path data with smooth Bézier curves.
 * From perfect-freehand docs: https://github.com/steveruizok/perfect-freehand
 */
function getSvgPathFromStroke(points: number[][], closed = true): string {
  const len = points.length

  if (len < 4) {
    return ''
  }

  let a = points[0]
  let b = points[1]
  const c = points[2]

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${((b[0] + c[0]) / 2).toFixed(2)},${((b[1] + c[1]) / 2).toFixed(2)} T`

  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i]
    b = points[i + 1]
    result += `${((a[0] + b[0]) / 2).toFixed(2)},${((a[1] + b[1]) / 2).toFixed(2)} `
  }

  if (closed) {
    result += 'Z'
  }

  return result
}

/**
 * Draw a pen stroke element using perfect-freehand.
 * Points are in local coordinates (relative to element position).
 * Uses polygon-clipping to handle self-intersections, then renders with smooth Bézier curves.
 */
export function drawPen(args: {
  graphics: Graphics
  element: TBackendElementOf<'pen'>
}): void {
  const { graphics, element } = args
  const { data, style } = element

  graphics.clear()

  if (data.points.length < 2) return

  // Convert to perfect-freehand input format: [x, y, pressure]
  const inputPoints = data.points.map((pt, i) => [
    pt[0],
    pt[1],
    data.pressures[i] ?? 0.5
  ])

  // Get stroke outline from perfect-freehand
  const strokePoints = getStroke(inputPoints, {
    size: style.strokeWidth ?? 4,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: data.simulatePressure,
  })

  if (strokePoints.length < 4) return

  const fillColor = style.strokeColor ?? '#000000'
  const ring = strokePoints as [number, number][]

  // Use polygon-clipping to flatten self-intersecting strokes
  const faces = polygonClipping.union([[ring]])

  // Build combined SVG path from all faces with smooth Bézier curves
  const pathParts: string[] = []
  for (const polygon of faces) {
    for (const face of polygon) {
      const pathData = getSvgPathFromStroke(face)
      if (pathData) {
        pathParts.push(pathData)
      }
    }
  }

  if (pathParts.length === 0) return

  // Render using PixiJS SVG path support
  const svgPath = `<svg><path d="${pathParts.join(' ')}" fill="${fillColor}"/></svg>`
  graphics.svg(svgPath)
}

/**
 * Compute bounding box from points array.
 * Returns { x, y, width, height } where x,y is the min corner.
 */
export function computeBoundsFromPoints(points: [number, number][]): {
  x: number
  y: number
  width: number
  height: number
} {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const [x, y] of points) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}
