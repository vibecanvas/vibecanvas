import type { Graphics } from "pixi.js"
import type { TBackendElementOf } from "../../element.abstract"

export function drawDiamond(args: { graphics: Graphics, element: TBackendElementOf<'diamond'> }): void {
  const { graphics: g, element } = args
  const { data, style } = element
  const { w, h } = data
  const { backgroundColor, strokeColor, strokeWidth } = style

  g.clear()

  // Diamond vertices: top, right, bottom, left
  const points = [
    w / 2, 0,     // top
    w, h / 2,     // right
    w / 2, h,     // bottom
    0, h / 2,     // left
  ]

  if (backgroundColor) {
    g.fill({ color: backgroundColor })
  }

  if (strokeColor) {
    g.stroke({
      color: strokeColor,
      width: strokeWidth ?? 1
    })
  }

  g.poly(points, true)

  g.fill()
  if (strokeColor) {
    g.stroke()
  }
}
