import { Graphics } from "pixi.js"

export type TDebugShape = {
  type: 'rect' | 'point'
  x: number
  y: number
  w?: number
  h?: number
  color: number
}

export function createDebugRect(
  x: number,
  y: number,
  width: number,
  height: number,
  color: number = 0xff0000
): Graphics {
  return new Graphics()
    .rect(x, y, width, height)
    .stroke({ color, width: 2 })
}

export function createDebugShapes(shapes: TDebugShape[]): Graphics {
  const graphics = new Graphics()
  for (const shape of shapes) {
    if (shape.type === 'rect') {
      graphics.rect(shape.x, shape.y, shape.w ?? 10, shape.h ?? 10)
      graphics.stroke({ color: shape.color, width: 2 })
    } else if (shape.type === 'point') {
      graphics.circle(shape.x, shape.y, 6)
      graphics.fill({ color: shape.color })
    }
  }
  return graphics
}

export function destroyDebugGraphics(graphics: Graphics | null): null {
  if (graphics) {
    graphics.destroy()
  }
  return null
}
