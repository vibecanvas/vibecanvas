import type { Graphics } from "pixi.js"
import type { TBackendElementOf } from "../../element.abstract"

export function drawRect(args: { graphics: Graphics, element: TBackendElementOf<'rect'> }): void {
  const { graphics: g, element } = args
  const { data, style } = element
  const { w, h, radius: dataRadius } = data
  const { backgroundColor, strokeColor, strokeWidth, cornerRadius } = style

  g.clear()

  const radius = dataRadius ?? cornerRadius ?? 0

  if (backgroundColor) {
    g.fill({ color: backgroundColor })
  }

  if (strokeColor) {
    g.stroke({
      color: strokeColor,
      width: strokeWidth ?? 1
    })
  }

  if (radius > 0) {
    g.roundRect(0, 0, w, h, radius)
  } else {
    g.rect(0, 0, w, h)
  }

  g.fill()
  if (strokeColor) {
    g.stroke()
  }
}
