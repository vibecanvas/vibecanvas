import { Container, FederatedPointerEvent, Graphics, GraphicsContext, Point, Rectangle } from "pixi.js";
import type { Canvas } from "../../canvas/canvas";
import type { InputCommand } from "../../input-commands/types";
import type { IRenderable } from "../renderable.interface";
import type { ITransformable, TTransformBoxMode } from "../transformable.interface";
import { buildPointerContext, runCommands } from "../../input-commands/command.helper";

export type TTransformBoxOptions = {
  /** Commands to attach to corner handles. Defaults to [cmdResize]. */
  cornerCommands: InputCommand[]
  edgeCommands: InputCommand[]
  rotationCommands: InputCommand[]
}

const SELECTION_COLOR = 0x3b82f6 // blue-500
const SELECTION_FILL = 0xffffff // white
const SELECTION_PADDING = 4
const CORNER_HANDLE_SIZE = 8
const ROTATION_HANDLE_SIZE = 8
const ROTATION_HANDLE_OFFSET = 20
const EDGE_HIT_THICKNESS = 8

// Resize cursors in order: N/S, NE/SW diagonal, E/W, NW/SE diagonal
const RESIZE_CURSORS = ['ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize'] as const

/**
 * Get the appropriate resize cursor based on handle's base angle and shape rotation.
 * @param baseAngleDeg - Handle's base angle in degrees (N=0, NE=45, E=90, etc.)
 * @param rotationRad - Shape's rotation in radians
 */
function getResizeCursor(baseAngleDeg: number, rotationRad: number): string {
  const rotationDeg = rotationRad * 180 / Math.PI
  // Normalize to 0-360 range
  const effectiveAngle = ((baseAngleDeg + rotationDeg) % 360 + 360) % 360
  // Divide into 8 segments of 45° each, offset by 22.5° for centering
  const segment = Math.round(effectiveAngle / 45) % 8
  // Map 8 segments to 4 cursors (they repeat every 180°)
  return RESIZE_CURSORS[segment % 4]
}

export class TransformBox implements IRenderable {
  public id: string
  public container: Container = new Container({ label: 'transform-box-container', visible: false })
  public frameEdges: Container = new Container({ label: 'transform-box-frame-edges' })
  public topEdge!: Graphics
  public bottomEdge!: Graphics
  public leftEdge!: Graphics
  public rightEdge!: Graphics
  public cornerHandles: Container = new Container({ label: 'transform-box-corner-handles' })
  public rotationHandle: Graphics = new Graphics({ label: 'transform-box-rotation-handle' })
  // Handles for corner reference
  private nwHandle!: Graphics
  private neHandle!: Graphics
  private seHandle!: Graphics
  private swHandle!: Graphics
  private canvas: Canvas
  public _mode: TTransformBoxMode = 'full'

  private cornerCommands: InputCommand[]
  private edgeCommands: InputCommand[]
  private rotationCommands: InputCommand[]

  static isTransformBox(instance: unknown): instance is TransformBox {
    return instance instanceof TransformBox
  }

  constructor(
    public target: ITransformable,
    canvas: Canvas,
    options: TTransformBoxOptions
  ) {
    this.id = crypto.randomUUID()
    this.canvas = canvas
    this.cornerCommands = options.cornerCommands
    this.edgeCommands = options.edgeCommands
    this.rotationCommands = options.rotationCommands
    this.container.addChild(this.frameEdges)
    this.container.addChild(this.cornerHandles)
    this.container.addChild(this.rotationHandle)

    this.draw()
  }

  private draw() {
    this.drawFrameEdges()
    this.drawCornerHandles()
    this.drawRotationHandle()
    this.attachCommands()
    this.updateCursors()
  }

  /** Update resize cursors based on shape rotation */
  private updateCursors(): void {
    const rotation = this.target.rotation

    // Edge handles (N=0°, E=90°, S=180°, W=270°)
    this.topEdge.cursor = getResizeCursor(0, rotation)
    this.bottomEdge.cursor = getResizeCursor(180, rotation)
    this.leftEdge.cursor = getResizeCursor(270, rotation)
    this.rightEdge.cursor = getResizeCursor(90, rotation)

    // Corner handles (NW=315°, NE=45°, SE=135°, SW=225°)
    this.nwHandle.cursor = getResizeCursor(315, rotation)
    this.neHandle.cursor = getResizeCursor(45, rotation)
    this.seHandle.cursor = getResizeCursor(135, rotation)
    this.swHandle.cursor = getResizeCursor(225, rotation)
  }

  private drawFrameEdges() {
    const bounds = this.target.localBounds
    const p = SELECTION_PADDING
    const width = bounds.width + 2 * p
    const height = bounds.height + 2 * p

    // Shared context for horizontal edges (top/bottom)
    const horizontalCtx = new GraphicsContext()
      .moveTo(0, 0)
      .lineTo(width, 0)
      .stroke({ color: SELECTION_COLOR, pixelLine: true })

    // Shared context for vertical edges (left/right)
    const verticalCtx = new GraphicsContext()
      .moveTo(0, 0)
      .lineTo(0, height)
      .stroke({ color: SELECTION_COLOR, pixelLine: true })

    // Top edge
    this.topEdge = new Graphics(horizontalCtx)
    this.topEdge.label = 'top-edge'
    this.topEdge.position.set(-p, -p)
    this.topEdge.hitArea = new Rectangle(0, -EDGE_HIT_THICKNESS / 2, width, EDGE_HIT_THICKNESS)

    // Bottom edge - same context, translated
    this.bottomEdge = new Graphics(horizontalCtx)
    this.bottomEdge.label = 'bottom-edge'
    this.bottomEdge.position.set(-p, bounds.height + p)
    this.bottomEdge.hitArea = new Rectangle(0, -EDGE_HIT_THICKNESS / 2, width, EDGE_HIT_THICKNESS)

    // Left edge
    this.leftEdge = new Graphics(verticalCtx)
    this.leftEdge.label = 'left-edge'
    this.leftEdge.position.set(-p, -p)
    this.leftEdge.hitArea = new Rectangle(-EDGE_HIT_THICKNESS / 2, 0, EDGE_HIT_THICKNESS, height)

    // Right edge - same context, translated
    this.rightEdge = new Graphics(verticalCtx)
    this.rightEdge.label = 'right-edge'
    this.rightEdge.position.set(bounds.width + p, -p)
    this.rightEdge.hitArea = new Rectangle(-EDGE_HIT_THICKNESS / 2, 0, EDGE_HIT_THICKNESS, height)

    this.frameEdges.addChild(this.topEdge)
    this.frameEdges.addChild(this.bottomEdge)
    this.frameEdges.addChild(this.leftEdge)
    this.frameEdges.addChild(this.rightEdge)
  }

  private drawCornerHandles() {
    const bounds = this.target.localBounds
    const halfSize = CORNER_HANDLE_SIZE / 2

    // Calculate corner positions (with padding)
    const left = -SELECTION_PADDING
    const top = -SELECTION_PADDING
    const right = bounds.width + SELECTION_PADDING
    const bottom = bounds.height + SELECTION_PADDING

    const createHandle = (x: number, y: number, label: string): Graphics => {
      const handle = new Graphics({ label })
      handle
        .rect(x - halfSize, y - halfSize, CORNER_HANDLE_SIZE, CORNER_HANDLE_SIZE)
        .fill({ color: SELECTION_FILL })
        .stroke({ color: SELECTION_COLOR, pixelLine: true })
      return handle
    }

    this.nwHandle = createHandle(left, top, 'nw-handle')
    this.neHandle = createHandle(right, top, 'ne-handle')
    this.seHandle = createHandle(right, bottom, 'se-handle')
    this.swHandle = createHandle(left, bottom, 'sw-handle')

    this.cornerHandles.addChild(this.nwHandle)
    this.cornerHandles.addChild(this.neHandle)
    this.cornerHandles.addChild(this.seHandle)
    this.cornerHandles.addChild(this.swHandle)
  }

  private drawRotationHandle() {
    const bounds = this.target.localBounds
    const centerX = bounds.width / 2
    const handleY = -SELECTION_PADDING - ROTATION_HANDLE_OFFSET

    this.rotationHandle
      // Stem line from top edge to handle
      .moveTo(centerX, -SELECTION_PADDING)
      .lineTo(centerX, handleY)
      .stroke({ color: SELECTION_COLOR, pixelLine: true })
      // Circle handle
      .circle(centerX, handleY, ROTATION_HANDLE_SIZE / 2)
      .fill({ color: SELECTION_FILL })
      .stroke({ color: SELECTION_COLOR, pixelLine: true })

    this.rotationHandle.cursor = 'grab'
    this.rotationHandle.hitArea = new Rectangle(
      centerX - ROTATION_HANDLE_SIZE,
      handleY - ROTATION_HANDLE_SIZE,
      ROTATION_HANDLE_SIZE * 2,
      ROTATION_HANDLE_SIZE * 2
    )
  }

  private attachCommands() {
    // Attach resize commands to edge handles
    const pointerCornerHandler = (listenerId: string, commands: InputCommand[]) => (e: FederatedPointerEvent) => {
      e.stopPropagation()
      const ctx = buildPointerContext(this.canvas, this, e, listenerId)
      runCommands(commands, ctx)
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
    const topEdgeHandler = pointerCornerHandler('n', this.edgeCommands)
    const bottomEdgeHandler = pointerCornerHandler('s', this.edgeCommands)
    const leftEdgeHandler = pointerCornerHandler('w', this.edgeCommands)
    const rightEdgeHandler = pointerCornerHandler('e', this.edgeCommands)
    const nwCornerHandleHandler = pointerCornerHandler('nw', this.cornerCommands)
    const neCornerHandleHandler = pointerCornerHandler('ne', this.cornerCommands)
    const seCornerHandleHandler = pointerCornerHandler('se', this.cornerCommands)
    const swCornerHandleHandler = pointerCornerHandler('sw', this.cornerCommands)

    const topEdgeCleanup = applyPointerListener(this.topEdge, topEdgeHandler)
    const bottomEdgeCleanup = applyPointerListener(this.bottomEdge, bottomEdgeHandler)
    const leftEdgeCleanup = applyPointerListener(this.leftEdge, leftEdgeHandler)
    const rightEdgeCleanup = applyPointerListener(this.rightEdge, rightEdgeHandler)
    const nwCornerHandleCleanup = applyPointerListener(this.nwHandle, nwCornerHandleHandler)
    const neCornerHandleCleanup = applyPointerListener(this.neHandle, neCornerHandleHandler)
    const seCornerHandleCleanup = applyPointerListener(this.seHandle, seCornerHandleHandler)
    const swCornerHandleCleanup = applyPointerListener(this.swHandle, swCornerHandleHandler)


    const rotationHandleHandler = pointerCornerHandler('rotation', this.rotationCommands)
    const rotationHandleCleanup = applyPointerListener(this.rotationHandle, rotationHandleHandler)

    this.container.on('destroyed', () => {
      topEdgeCleanup()
      bottomEdgeCleanup()
      leftEdgeCleanup()
      rightEdgeCleanup()
      nwCornerHandleCleanup()
      neCornerHandleCleanup()
      seCornerHandleCleanup()
      swCornerHandleCleanup()
      rotationHandleCleanup()
    })

  }

  // --- Methods called by commands ---

  public getCenter(): Point {
    const pos = this.target.worldPosition
    return new Point(pos.x, pos.y)
  }

  /** Redraw the transform box to match new bounds (preserves command attachments) */
  public redraw(): void {
    // Hide during redraw to prevent flicker from intermediate render states
    this.container.visible = false

    const bounds = this.target.localBounds
    const p = SELECTION_PADDING
    const width = bounds.width + 2 * p
    const height = bounds.height + 2 * p
    const halfSize = CORNER_HANDLE_SIZE / 2

    // Redraw edges (length changes, so need to redraw the line)
    this.topEdge.clear()
      .moveTo(0, 0)
      .lineTo(width, 0)
      .stroke({ color: SELECTION_COLOR, pixelLine: true })
    this.topEdge.position.set(-p, -p)
    this.topEdge.hitArea = new Rectangle(0, -EDGE_HIT_THICKNESS / 2, width, EDGE_HIT_THICKNESS)

    this.bottomEdge.clear()
      .moveTo(0, 0)
      .lineTo(width, 0)
      .stroke({ color: SELECTION_COLOR, pixelLine: true })
    this.bottomEdge.position.set(-p, bounds.height + p)
    this.bottomEdge.hitArea = new Rectangle(0, -EDGE_HIT_THICKNESS / 2, width, EDGE_HIT_THICKNESS)

    this.leftEdge.clear()
      .moveTo(0, 0)
      .lineTo(0, height)
      .stroke({ color: SELECTION_COLOR, pixelLine: true })
    this.leftEdge.position.set(-p, -p)
    this.leftEdge.hitArea = new Rectangle(-EDGE_HIT_THICKNESS / 2, 0, EDGE_HIT_THICKNESS, height)

    this.rightEdge.clear()
      .moveTo(0, 0)
      .lineTo(0, height)
      .stroke({ color: SELECTION_COLOR, pixelLine: true })
    this.rightEdge.position.set(bounds.width + p, -p)
    this.rightEdge.hitArea = new Rectangle(-EDGE_HIT_THICKNESS / 2, 0, EDGE_HIT_THICKNESS, height)

    // Update corner handle positions
    const left = -p
    const top = -p
    const right = bounds.width + p
    const bottom = bounds.height + p

    this.nwHandle.clear()
      .rect(left - halfSize, top - halfSize, CORNER_HANDLE_SIZE, CORNER_HANDLE_SIZE)
      .fill({ color: SELECTION_FILL })
      .stroke({ color: SELECTION_COLOR, pixelLine: true })

    this.neHandle.clear()
      .rect(right - halfSize, top - halfSize, CORNER_HANDLE_SIZE, CORNER_HANDLE_SIZE)
      .fill({ color: SELECTION_FILL })
      .stroke({ color: SELECTION_COLOR, pixelLine: true })

    this.seHandle.clear()
      .rect(right - halfSize, bottom - halfSize, CORNER_HANDLE_SIZE, CORNER_HANDLE_SIZE)
      .fill({ color: SELECTION_FILL })
      .stroke({ color: SELECTION_COLOR, pixelLine: true })

    this.swHandle.clear()
      .rect(left - halfSize, bottom - halfSize, CORNER_HANDLE_SIZE, CORNER_HANDLE_SIZE)
      .fill({ color: SELECTION_FILL })
      .stroke({ color: SELECTION_COLOR, pixelLine: true })

    // Update rotation handle
    const centerX = bounds.width / 2
    const handleY = -p - ROTATION_HANDLE_OFFSET

    this.rotationHandle.clear()
      .moveTo(centerX, -p)
      .lineTo(centerX, handleY)
      .stroke({ color: SELECTION_COLOR, pixelLine: true })
      .circle(centerX, handleY, ROTATION_HANDLE_SIZE / 2)
      .fill({ color: SELECTION_FILL })
      .stroke({ color: SELECTION_COLOR, pixelLine: true })

    this.rotationHandle.hitArea = new Rectangle(
      centerX - ROTATION_HANDLE_SIZE,
      handleY - ROTATION_HANDLE_SIZE,
      ROTATION_HANDLE_SIZE * 2,
      ROTATION_HANDLE_SIZE * 2
    )

    // Update cursors based on current rotation
    this.updateCursors()

    this.container.visible = true
  }

  public get mode(): TTransformBoxMode {
    return this._mode
  }

  /**
   * Set the display mode of the transform box.
   * - 'full': Shows frame + handles + rotation (for single selection)
   * - 'frame': Shows only frame edges (for multi-selection members)
   */
  public setMode(mode: TTransformBoxMode): void {
    this._mode = mode
    this.applyMode()
  }

  private applyMode(): void {
    const showHandles = this._mode === 'full'
    this.cornerHandles.visible = showHandles
    this.rotationHandle.visible = showHandles

    // In frame mode, disable edge interactivity (no resize from edges)
    const edgeEventMode = showHandles ? 'static' : 'none'
    this.topEdge.eventMode = edgeEventMode as any
    this.bottomEdge.eventMode = edgeEventMode as any
    this.leftEdge.eventMode = edgeEventMode as any
    this.rightEdge.eventMode = edgeEventMode as any
  }

  public show() {
    this.applyMode()
    this.container.visible = true
  }

  public hide() {
    this.container.visible = false
  }

  public destroy() {
    this.frameEdges.destroy({ children: true })
    this.cornerHandles.destroy({ children: true })
    this.rotationHandle.destroy()
    this.container.destroy()
  }
}
