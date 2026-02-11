import { Rectangle, Texture } from "pixi.js"
import type { ImageElement } from "./image.class"

export function drawImage(inst: ImageElement): void {
  const { data, style } = inst.element
  const { w, h } = data

  // Set sprite dimensions
  inst.sprite.width = w
  inst.sprite.height = h

  // Draw placeholder if no texture loaded yet
  inst.graphics.clear()
  if (!inst.sprite.texture || inst.sprite.texture === Texture.EMPTY) {
    inst.graphics.rect(0, 0, w, h)
  }

  // Center pivot for rotation (same pattern as rect)
  inst.container.pivot.set(w / 2, h / 2)
  inst.container.position.set(inst.element.x + w / 2, inst.element.y + h / 2)
  inst.container.rotation = inst.element.angle
  inst.container.alpha = style.opacity ?? 1
  inst.container.boundsArea = new Rectangle(0, 0, w, h)
}
