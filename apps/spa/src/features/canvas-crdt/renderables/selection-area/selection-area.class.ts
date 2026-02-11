import { Container, Graphics } from "pixi.js"
import type { IRenderable } from "../renderable.interface"


export type TSelectionAreaBounds = {
  x: number
  y: number
  width: number
  height: number
}

export class SelectionAreaRenderable implements IRenderable {
  public id: string
  public container: Container = new Container()
  public graphics: Graphics = new Graphics()

  private bounds: TSelectionAreaBounds = { x: 0, y: 0, width: 0, height: 0 }

  constructor(id: string = 'selection-area') {
    this.id = id
    this.container.addChild(this.graphics)
    this.container.visible = false
  }

  public show(): void {
    this.container.visible = true
  }

  public hide(): void {
    this.container.visible = false
    this.graphics.clear()
  }

  public update(bounds: TSelectionAreaBounds): void {
    this.bounds = bounds
    this.draw()
  }

  public destroy(): void {
    this.graphics.destroy()
    this.container.destroy()
  }

  public move(dx: number, dy: number): void {
    throw "Don't use"
  }

  private draw(): void {
    const { x, y, width, height } = this.bounds

    this.graphics.clear()

    // Selection area fill (semi-transparent blue)
    this.graphics.rect(x, y, width, height)
    this.graphics.fill({ color: 0x3b82f6, alpha: 0.1 })

    // Selection area stroke (dashed blue border)
    this.graphics.rect(x, y, width, height)
    this.graphics.stroke({ color: 0x3b82f6, width: 1 })
  }
}
