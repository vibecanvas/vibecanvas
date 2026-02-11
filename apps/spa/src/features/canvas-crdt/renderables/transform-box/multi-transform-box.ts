import { Bounds, Container, FederatedPointerEvent, Graphics, Point, Rectangle } from "pixi.js";
import type { Canvas } from "../../canvas/canvas";
import { cmdDragSelection } from "../../input-commands/cmd.drag-selection";
import { cmdScale } from "../../input-commands/cmd.scale";
import { cmdRotate } from "../../input-commands/cmd.rotate";
import type { IRenderable } from "../renderable.interface";
import type { ITransformable } from "../transformable.interface";
import {
  calculateDashedLineSegments,
  computeBoundingBox,
  getBoundsCenter,
} from "./transform-box.math";
import { buildPointerContext, runCommands } from "../../input-commands/command.helper";
import { InputCommand } from "../../input-commands/types";

const SELECTION_COLOR = 0x3b82f6 // blue-500
const SELECTION_FILL = 0xffffff // white
const GROUP_PADDING = 8
const CORNER_HANDLE_SIZE = 8
const ROTATION_HANDLE_SIZE = 8
const ROTATION_HANDLE_OFFSET = 20
const DASH_LENGTH = 4
const DASH_GAP = 4

/**
 * MultiTransformBox renders a dashed bounding box around multiple selected items
 * with resize and rotation handles for multi transforms.
 */
export class MultiTransformBox implements IRenderable {
  public id: string
  public container: Container = new Container({ label: 'multi-transform-box-container', visible: false })

  private frameGraphics: Graphics = new Graphics({ label: 'multi-transform-box-frame' })
  private cornerHandles: Container = new Container({ label: 'multi-transform-box-corner-handles' })
  private rotationHandle: Graphics = new Graphics({ label: 'multi-transform-box-rotation-handle' })

  private nwHandle!: Graphics
  private neHandle!: Graphics
  private seHandle!: Graphics
  private swHandle!: Graphics

  public members: ITransformable[] = []
  public _bounds: Bounds = new Bounds()

  constructor(private canvas: Canvas) {
    this.id = crypto.randomUUID()

    this.container.addChild(this.frameGraphics)
    this.container.addChild(this.cornerHandles)
    this.container.addChild(this.rotationHandle)

    // Make frameGraphics interactive for dragging
    this.frameGraphics.eventMode = 'static'
    this.frameGraphics.cursor = 'move'

    this.drawCornerHandles()
    this.drawRotationHandle()
    this.attachCommands()
  }

  public move(x: number, y: number) {
    this.container.position.set(x, y)
  }

  public computeGroupBounds(): void {
    if (this.members.length === 0) {
      this._bounds = new Bounds()
      return
    }

    this._bounds = computeBoundingBox(this.members.map(m => m.worldBounds))
  }

  private drawDashedFrame(): void {
    const b = this._bounds
    const p = GROUP_PADDING

    this.frameGraphics.clear()

    // Draw dashed rectangle
    const x = b.x - p
    const y = b.y - p
    const w = b.width + 2 * p
    const h = b.height + 2 * p

    // Top edge
    this.drawDashedLine(x, y, x + w, y)
    // Right edge
    this.drawDashedLine(x + w, y, x + w, y + h)
    // Bottom edge
    this.drawDashedLine(x + w, y + h, x, y + h)
    // Left edge
    this.drawDashedLine(x, y + h, x, y)

    // Set hit area for pointer events on the frame
    this.frameGraphics.hitArea = new Rectangle(x, y, w, h)
  }

  private drawDashedLine(x1: number, y1: number, x2: number, y2: number): void {
    const segments = calculateDashedLineSegments(x1, y1, x2, y2, DASH_LENGTH, DASH_GAP)

    for (const seg of segments) {
      this.frameGraphics
        .moveTo(seg.startX, seg.startY)
        .lineTo(seg.endX, seg.endY)
        .stroke({ color: SELECTION_COLOR, width: 1 })
    }
  }

  private drawCornerHandles(): void {
    const halfSize = CORNER_HANDLE_SIZE / 2

    const createHandle = (label: string): Graphics => {
      const handle = new Graphics({ label })
      handle
        .rect(-halfSize, -halfSize, CORNER_HANDLE_SIZE, CORNER_HANDLE_SIZE)
        .fill({ color: SELECTION_FILL })
        .stroke({ color: SELECTION_COLOR, pixelLine: true })
      handle.eventMode = 'static'
      return handle
    }

    this.nwHandle = createHandle('group-nw-handle')
    this.neHandle = createHandle('group-ne-handle')
    this.seHandle = createHandle('group-se-handle')
    this.swHandle = createHandle('group-sw-handle')

    this.nwHandle.cursor = 'nwse-resize'
    this.seHandle.cursor = 'nwse-resize'
    this.neHandle.cursor = 'nesw-resize'
    this.swHandle.cursor = 'nesw-resize'

    this.cornerHandles.addChild(this.nwHandle)
    this.cornerHandles.addChild(this.neHandle)
    this.cornerHandles.addChild(this.seHandle)
    this.cornerHandles.addChild(this.swHandle)
  }

  private drawRotationHandle(): void {
    this.rotationHandle
      .circle(0, 0, ROTATION_HANDLE_SIZE / 2)
      .fill({ color: SELECTION_FILL })
      .stroke({ color: SELECTION_COLOR, pixelLine: true })

    this.rotationHandle.cursor = 'grab'
    this.rotationHandle.eventMode = 'static'
    this.rotationHandle.hitArea = new Rectangle(
      -ROTATION_HANDLE_SIZE,
      -ROTATION_HANDLE_SIZE,
      ROTATION_HANDLE_SIZE * 2,
      ROTATION_HANDLE_SIZE * 2
    )
  }

  private attachCommands(): void {
    const scaleCommands = [cmdScale]
    const rotateCommands = [cmdRotate]
    const dragCommands = [cmdDragSelection]

    const buildCornerHandler = (listenerId: string, commands: InputCommand[]) => (e: FederatedPointerEvent) => {
      e.stopPropagation()
      const ctx = buildPointerContext(this.canvas, this, e, listenerId)
      runCommands(commands, ctx)
    }
    const nwHandleHandler = buildCornerHandler('nw', scaleCommands)
    const neHandleHandler = buildCornerHandler('ne', scaleCommands)
    const seHandleHandler = buildCornerHandler('se', scaleCommands)
    const swHandleHandler = buildCornerHandler('sw', scaleCommands)
    const rotationHandleHandler = (e: FederatedPointerEvent) => {
      e.stopPropagation()
      const ctx = buildPointerContext(this.canvas, this, e, 'rotation')
      runCommands(rotateCommands, ctx)
    }
    const frameGraphicsHandler = (e: FederatedPointerEvent) => {
      e.stopPropagation()
      const ctx = buildPointerContext(this.canvas, this, e, 'body')
      runCommands(dragCommands, ctx)
    }
    const applyPointerListener = (target: Container, handler: (e: FederatedPointerEvent) => void) => {
      target.eventMode = 'static'
      target.on('pointerdown', handler)
      target.on('globalpointermove', handler)
      target.on('pointerup', handler)
      target.on('pointerupoutside', handler)
      return () => {
        target.off('pointerdown', handler)
        target.off('globalpointermove', handler)
        target.off('pointerup', handler)
        target.off('pointerupoutside', handler)
      }
    }
    const nwHandleCleanup = applyPointerListener(this.nwHandle, nwHandleHandler)
    const neHandleCleanup = applyPointerListener(this.neHandle, neHandleHandler)
    const seHandleCleanup = applyPointerListener(this.seHandle, seHandleHandler)
    const swHandleCleanup = applyPointerListener(this.swHandle, swHandleHandler)
    const rotationHandleCleanup = applyPointerListener(this.rotationHandle, rotationHandleHandler)
    const frameGraphicsCleanup = applyPointerListener(this.frameGraphics, frameGraphicsHandler)

    this.container.on('destroyed', () => {
      nwHandleCleanup()
      neHandleCleanup()
      seHandleCleanup()
      swHandleCleanup()
      rotationHandleCleanup()
      frameGraphicsCleanup()
    })  
  }

  private updateHandlePositions(): void {
    const b = this._bounds
    const p = GROUP_PADDING

    const left = b.x - p
    const top = b.y - p
    const right = b.x + b.width + p
    const bottom = b.y + b.height + p
    const centerX = b.x + b.width / 2

    this.nwHandle.position.set(left, top)
    this.neHandle.position.set(right, top)
    this.seHandle.position.set(right, bottom)
    this.swHandle.position.set(left, bottom)

    // Rotation handle above the top edge
    const handleY = top - ROTATION_HANDLE_OFFSET
    this.rotationHandle.position.set(centerX, handleY)

    // Draw stem line from top edge to rotation handle
    this.rotationHandle.clear()
      .moveTo(0, ROTATION_HANDLE_OFFSET)
      .lineTo(0, 0)
      .stroke({ color: SELECTION_COLOR, pixelLine: true })
      .circle(0, 0, ROTATION_HANDLE_SIZE / 2)
      .fill({ color: SELECTION_FILL })
      .stroke({ color: SELECTION_COLOR, pixelLine: true })
  }

  public redraw(): void {
    this.container.visible = false

    this.drawDashedFrame()
    this.updateHandlePositions()

    this.container.visible = true
  }

  // --- Methods called by commands ---

  public getCenter(): Point {
    return getBoundsCenter(this._bounds)
  }

  public show(): void {
    if (this.members.length > 1) {
      this.computeGroupBounds()
      this.redraw()
      this.container.visible = true
    }
  }

  public hide(): void {
    this.container.visible = false
  }

  public destroy(): void {
    this.container.destroy({ children: true })
  }
}
