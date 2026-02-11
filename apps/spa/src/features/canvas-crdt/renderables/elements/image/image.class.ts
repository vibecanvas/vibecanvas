import type { Canvas } from "@/features/canvas-crdt/canvas/canvas";
import { cmdResize, cmdRotate } from "@/features/canvas-crdt/input-commands";
import { cmdDragClone } from "@/features/canvas-crdt/input-commands/cmd.drag-clone";
import type { TCloneAction, TMoveAction, TResizeAction, TRotateAction, TScaleAction, TSetPositionAction, TSetStyleAction } from "@/features/canvas-crdt/types/actions";
import { Assets, Graphics, Rectangle, Sprite } from "pixi.js";
import { cmdDragSelection } from "../../../input-commands/cmd.drag-selection";
import { cmdSelectOnClick } from "../../../input-commands/cmd.select-on-click";
import {
  type TAction,
  type TActionType,
  type TChanges,
} from "../../../types";
import { AElement, type TBackendElementOf } from "../../element.abstract";
import { computeRotatedAABB } from "../../math.util";
import { TransformBox } from "../../transform-box/transform-box";
import type { TDimensions, TResizeContext } from "../../transformable.interface";
import { drawImage } from "./image.draw";
import { calculateRotatedResize } from "../rect/rect.math";

// Apply functions from rect
import { clampSize, clampX, clampY, type TApplyContextWH } from "../rect/rect.apply-context";
import { applyMove } from "../rect/rect.apply-move";
import { applyRotate } from "../rect/rect.apply-rotate";
import { applySetPosition } from "../rect/rect.apply-position";
import { applyScale } from "../rect/rect.apply-scale";
import { applyResize } from "../rect/rect.apply-resize";
import { applySelect } from "../rect/rect.apply-select";
import { applyDeselect } from "../rect/rect.apply-deselect";
import { applySetStyle } from "../rect/rect.apply-style";
import { applyDelete } from "../rect/rect.apply-delete";
// Clone is image-specific
import { applyClone } from "./image.apply-clone";

const commands = [cmdSelectOnClick, cmdDragClone, cmdDragSelection]

const IMAGE_SUPPORTED_ACTIONS: ReadonlySet<TActionType> = new Set([
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

export class ImageElement extends AElement<'image'> {
  public sprite: Sprite = new Sprite()
  public graphics: Graphics = new Graphics()

  constructor(element: TBackendElementOf<'image'>, canvas: Canvas) {
    super(element, canvas)
    this.container.addChild(this.graphics)
    this.container.addChild(this.sprite)
    this.container.label = 'image-element-container'

    this.loadTexture()

    this.transformBox = new TransformBox(this, canvas, {
      cornerCommands: [cmdResize],
      edgeCommands: [cmdResize],
      rotationCommands: [cmdRotate],
    })
    this.container.addChild(this.transformBox.container)
    this.setupPointerListeners('image', commands)
  }

  // ─────────────────────────────────────────────────────────────
  // IActionable Implementation
  // ─────────────────────────────────────────────────────────────

  public get supportedActions(): ReadonlySet<TActionType> {
    return IMAGE_SUPPORTED_ACTIONS
  }

  public canApply(action: TAction): boolean {
    return this.supportedActions.has(action.type as TActionType)
  }

  /**
   * Build context object for apply functions.
   * All apply functions receive this context to access element state and methods.
   */
  private getApplyContext(): TApplyContextWH {
    return {
      element: this.element,
      id: this.id,
      container: this.container,
      transformBox: this.transformBox,
      canvas: this.canvas,
      redraw: () => this.redraw(),
      localBounds: this.localBounds,
      isSelected: this._isSelected,
      setIsSelected: (value: boolean) => { this.isSelected = value },
      setResize: (ctx: TResizeContext) => this.setResize(ctx),
    }
  }

  public dispatch(action: TAction): TChanges | null {
    if (!this.canApply(action)) return null

    const ctx = this.getApplyContext()

    switch (action.type) {
      case 'setPosition':
        return applySetPosition(ctx, action as TSetPositionAction)
      case 'move':
        return applyMove(ctx, action as TMoveAction)
      case 'rotate':
        return applyRotate(ctx, action as TRotateAction)
      case 'scale':
        return applyScale(ctx, action as TScaleAction)
      case 'resize':
        return applyResize(ctx, action as TResizeAction)
      case 'select':
        return applySelect(ctx)
      case 'deselect':
        return applyDeselect(ctx)
      case 'setStyle':
        return applySetStyle(ctx, action as TSetStyleAction)
      case 'clone':
        return applyClone(ctx, action as TCloneAction)
      case 'delete':
        return applyDelete(ctx)
      default:
        return null
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ITransformable
  // ─────────────────────────────────────────────────────────────

  public get dimensions(): TDimensions {
    return { w: this.element.data.w, h: this.element.data.h }
  }

  public set dimensions(dim: TDimensions) {
    const w = clampSize(dim.w)
    const h = clampSize(dim.h)
    this.element.data.w = w
    this.element.data.h = h
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
    const bounds = calculateRotatedResize(ctx, this.container.rotation)

    this.element.x = clampX(bounds.x)
    this.element.y = clampY(bounds.y)
    this.element.data.w = clampSize(bounds.w)
    this.element.data.h = clampSize(bounds.h)
    this.redraw()
    this.transformBox?.redraw()
  }

  public redraw(): void {
    drawImage(this)
  }

  // ─────────────────────────────────────────────────────────────
  // Image-specific Methods
  // ─────────────────────────────────────────────────────────────

  private async loadTexture(): Promise<void> {
    const { url, base64 } = this.element.data

    if (url) {
      try {
        const texture = await Assets.load(url)
        this.sprite.texture = texture
        this.redraw()
        return
      } catch (urlError) {
        console.warn('[ImageElement] Failed to load image URL:', urlError)
      }
    }

    if (base64) {
      try {
        const texture = await Assets.load(base64)
        this.sprite.texture = texture
      } catch (base64Error) {
        console.warn('[ImageElement] Failed to load inline image:', base64Error)
      }
    }

    this.redraw()
  }

  static isImageElement(instance: AElement): instance is ImageElement {
    return instance instanceof ImageElement
  }
}
