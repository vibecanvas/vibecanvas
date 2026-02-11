import type { Graphics } from "pixi.js"
import type { TBackendElementOf } from "../../element.abstract"

export function drawEllipse(args: { graphics: Graphics, element: TBackendElementOf<'ellipse'> }): void {
  const { graphics: g, element } = args
  const { data, style } = element
  const { rx, ry } = data
  const { backgroundColor, strokeColor, strokeWidth } = style

  g.clear()

  if (backgroundColor) {
    g.fill({ color: backgroundColor })
  }

  if (strokeColor) {
    g.stroke({
      color: strokeColor,
      width: strokeWidth ?? 1
    })
  }

  // Draw ellipse centered at (rx, ry) so it fits in bounds (0,0) to (w,h)
  g.ellipse(rx, ry, rx, ry)

  g.fill()
  if (strokeColor) {
    g.stroke()
  }
}
