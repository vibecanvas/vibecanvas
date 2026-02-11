import type { Canvas } from "@/features/canvas-crdt/canvas/canvas";
import { cmdDragClone } from "@/features/canvas-crdt/input-commands/cmd.drag-clone";
import { cmdResize } from "@/features/canvas-crdt/input-commands/cmd.resize";
import { cmdRotate } from "@/features/canvas-crdt/input-commands/cmd.rotate";
import { Graphics, Rectangle } from "pixi.js";
import { cmdDragSelection } from "../../../input-commands/cmd.drag-selection";
import { cmdSelectOnClick } from "../../../input-commands/cmd.select-on-click";
import type { TAction, TActionType, TChanges } from "../../../types";
import type { TBackendElementOf } from "../../element.abstract";
import { AElement } from "../../element.abstract";
import { computeRotatedAABB } from "../../math.util";
import { TransformBox } from "../../transform-box/transform-box";
import type { TDimensions, TResizeContext } from "../../transformable.interface";
import { drawEllipse } from "./ellipse.draw";
import { calculateRotatedResizeForEllipse } from "./ellipse.math";

// Shared apply functions from rect
import { clampX, clampY, type TApplyContextRadius } from "../rect/rect.apply-context";
import { applyMove } from "../rect/rect.apply-move";
import { applyRotate } from "../rect/rect.apply-rotate";
import { applySetPosition } from "../rect/rect.apply-position";
import { applySelect } from "../rect/rect.apply-select";
import { applyDeselect } from "../rect/rect.apply-deselect";
import { applySetStyle } from "../rect/rect.apply-style";
import { applyDelete } from "../rect/rect.apply-delete";

// Unique ellipse apply functions
import { applyScale, clampRadius } from "./ellipse.apply-scale";
import { applyResize } from "./ellipse.apply-resize";
import { applyClone } from "./ellipse.apply-clone";

const commands = [cmdSelectOnClick, cmdDragClone, cmdDragSelection]

const ELLIPSE_SUPPORTED_ACTIONS: ReadonlySet<TActionType> = new Set([
  'setPosition',
  'move',
  'rotate',
  'scale',
  'resize',
  'clone',
  'delete',
  'select',
  'deselect',
  'setStyle',
] as const)

export class EllipseElement extends AElement<'ellipse'> {
  private graphics: Graphics = new Graphics()

  constructor(element: TBackendElementOf<'ellipse'>, canvas: Canvas) {
    super(element, canvas)
    this.container.addChild(this.graphics)
    this.container.label = 'ellipse-drawing-renderable-container'
    this.redraw()

    this.transformBox = new TransformBox(this, canvas, {
      cornerCommands: [cmdResize],
      edgeCommands: [cmdResize],
      rotationCommands: [cmdRotate],
    })
    this.container.addChild(this.transformBox.container)
    this.setupPointerListeners('ellipse', commands)
  }

  public get supportedActions(): ReadonlySet<TActionType> {
    return ELLIPSE_SUPPORTED_ACTIONS
  }

  public canApply(action: TAction): boolean {
    return this.supportedActions.has(action.type as TActionType)
  }

  private getApplyContext(): TApplyContextRadius {
    return {
      element: this.element,
      id: this.id,
      container: this.container,
      transformBox: this.transformBox,
      canvas: this.canvas,
      redraw: () => this.redraw(),
      localBounds: this.localBounds,
      isSelected: this.isSelected,
      setIsSelected: (value: boolean) => { this.isSelected = value },
      setResize: (ctx: TResizeContext) => this.setResize(ctx),
    }
  }

  public dispatch(action: TAction): TChanges | null {
    if (!this.canApply(action)) return null

    const ctx = this.getApplyContext()

    switch (action.type) {
      case 'setPosition':
        return applySetPosition(ctx, action)
      case 'move':
        return applyMove(ctx, action)
      case 'rotate':
        return applyRotate(ctx, action)
      case 'scale':
        return applyScale(ctx, action)
      case 'resize':
        return applyResize(ctx, action)
      case 'select':
        return applySelect(ctx)
      case 'deselect':
        return applyDeselect(ctx)
      case 'setStyle':
        return applySetStyle(ctx, action)
      case 'clone':
        return applyClone(ctx, action)
      case 'delete':
        return applyDelete(ctx)
      default:
        return null
    }
  }

  // Dimensions are width/height (2*rx, 2*ry)
  public get dimensions(): TDimensions {
    return { w: this.element.data.rx * 2, h: this.element.data.ry * 2 }
  }

  public set dimensions(dim: TDimensions) {
    const rx = clampRadius(dim.w / 2)
    const ry = clampRadius(dim.h / 2)
    this.element.data.rx = rx
    this.element.data.ry = ry
    this.redraw()
  }

  public getWorldBounds(): Rectangle {
    const local = this.container.getLocalBounds()
    return computeRotatedAABB(
      this.container.x,
      this.container.y,
      local.width,
      local.height,
      this.container.rotation
    )
  }

  public setResize(ctx: TResizeContext): void {
    const bounds = calculateRotatedResizeForEllipse(ctx, this.container.rotation)

    this.element.x = clampX(bounds.x)
    this.element.y = clampY(bounds.y)
    this.element.data.rx = clampRadius(bounds.w / 2)
    this.element.data.ry = clampRadius(bounds.h / 2)
    this.redraw()
    this.transformBox?.redraw()
  }

  public redraw(): void {
    drawEllipse({ graphics: this.graphics, element: this.element })

    const { rx, ry } = this.element.data
    const { opacity } = this.element.style
    const w = rx * 2
    const h = ry * 2

    this.container.alpha = opacity ?? 1
    this.container.pivot.set(w / 2, h / 2)
    this.container.position.set(this.element.x + w / 2, this.element.y + h / 2)
    this.container.boundsArea = new Rectangle(0, 0, w, h)

  }

  static isEllipseElement(instance: AElement): instance is EllipseElement {
    return instance instanceof EllipseElement
  }

}
