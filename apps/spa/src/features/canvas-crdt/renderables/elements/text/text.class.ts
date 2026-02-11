import { Text } from "pixi.js"
import { AElement, type TBackendElementOf } from "../../element.abstract"
import type { Canvas } from "@/features/canvas-crdt/canvas/canvas"
import { TransformBox } from "../../transform-box/transform-box"
import type { TDimensions, TResizeContext } from "../../transformable.interface"
import type { TAction, TActionType, TChanges } from "../../../types"
import { cmdSelectOnClick } from "../../../input-commands/cmd.select-on-click"
import { cmdDragSelection } from "../../../input-commands/cmd.drag-selection"
import { cmdDragClone } from "@/features/canvas-crdt/input-commands/cmd.drag-clone"
import type { TMoveAction, TRotateAction, TCloneAction, TSetStyleAction, TSetPositionAction, TResizeAction } from "@/features/canvas-crdt/types/actions"
import { cmdRotate } from "@/features/canvas-crdt/input-commands/cmd.rotate"
import { cmdResize } from "@/features/canvas-crdt/input-commands/cmd.resize"
import type { TTextData } from "@vibecanvas/shell"

// Import shared apply functions from rect
import type { TApplyContext } from "../rect/rect.apply-context"
import { applyMove } from "../rect/rect.apply-move"
import { applyRotate } from "../rect/rect.apply-rotate"
import { applySetPosition } from "../rect/rect.apply-position"
import { applySelect } from "../rect/rect.apply-select"
import { applyDeselect } from "../rect/rect.apply-deselect"
import { applySetStyle } from "../rect/rect.apply-style"
import { applyDelete } from "../rect/rect.apply-delete"
import { clampX, clampY } from "../rect/rect.apply-context"
import { calculateRotatedResize, getFixedAnchorOffset } from "../rect/rect.math"

// Import unique apply functions
import { applyClone } from "./text.apply-clone"
import { applyEnter } from "./text.apply-enter"
import { applyResize } from "./text.apply-resize"

const commands = [cmdSelectOnClick, cmdDragClone, cmdDragSelection]

/** Actions supported by TextElement */
const TEXT_SUPPORTED_ACTIONS: ReadonlySet<TActionType> = new Set([
  'setPosition',
  'move',
  'rotate',
  'resize',
  'select',
  'deselect',
  'setStyle',
  'clone',
  'delete',
  'enter',
] as const)

export class TextElement extends AElement<'text'> {
  public text: Text = new Text()
  private resizeStartKey: string | null = null
  private resizeStartFontSize: number = 16

  constructor(element: TBackendElementOf<'text'>, canvas: Canvas) {
    super(element, canvas)
    this.container.addChild(this.text)
    this.container.label = 'text-element-container'

    this.redraw()

    // TransformBox without resize (text doesn't resize like shapes)
    this.transformBox = new TransformBox(this, canvas, {
      cornerCommands: [cmdResize],
      edgeCommands: [cmdResize],
      rotationCommands: [cmdRotate],
    })
    this.container.addChild(this.transformBox.container)
    this.setupPointerListeners('text', commands)

  }

  // ─────────────────────────────────────────────────────────────
  // Apply Context
  // ─────────────────────────────────────────────────────────────

  private getApplyContext(): TApplyContext<TTextData> {
    return {
      element: this.element,
      id: this.id,
      container: this.container,
      transformBox: this.transformBox,
      canvas: this.canvas,
      redraw: () => this.redraw(),
      localBounds: { width: this.element.data.w, height: this.element.data.h },
      isSelected: this.isSelected,
      setIsSelected: (value: boolean) => { this.isSelected = value },
      setResize: (ctx) => this.setResize(ctx),
    }
  }

  // ─────────────────────────────────────────────────────────────
  // IActionable Implementation
  // ─────────────────────────────────────────────────────────────

  public get supportedActions(): ReadonlySet<TActionType> {
    return TEXT_SUPPORTED_ACTIONS
  }

  public canApply(action: TAction): boolean {
    return this.supportedActions.has(action.type as TActionType)
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
      case 'resize':
        return applyResize(ctx, action as TResizeAction)
      case 'select':
        return applySelect(ctx)
      case 'deselect':
        return applyDeselect(ctx)
      case 'setStyle':
        return applySetStyle(ctx, action as TSetStyleAction)
      case 'enter':
        return applyEnter(ctx, this.text)
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
    this.element.data.w = dim.w
    this.element.data.h = dim.h
    this.redraw()
  }

  public setResize(ctx: TResizeContext): void {
    const bounds = calculateRotatedResize(ctx, this.container.rotation)
    const gestureKey = `${ctx.startWorldX}:${ctx.startWorldY}:${ctx.startBounds.w}:${ctx.startBounds.h}`

    if (this.resizeStartKey !== gestureKey) {
      this.resizeStartKey = gestureKey
      this.resizeStartFontSize = this.element.data.fontSize
    }

    const widthScale = bounds.w / Math.max(1, ctx.startBounds.w)
    const heightScale = bounds.h / Math.max(1, ctx.startBounds.h)

    let scale = 1
    if (ctx.handle === 'e' || ctx.handle === 'w') {
      scale = widthScale
    } else if (ctx.handle === 'n' || ctx.handle === 's') {
      scale = heightScale
    } else {
      scale = Math.max(widthScale, heightScale)
    }

    const nextFontSize = Math.max(8, Math.min(512, Math.round(this.resizeStartFontSize * scale)))
    this.element.data.fontSize = nextFontSize

    // First pass: place using computed bounds
    this.element.x = clampX(bounds.x)
    this.element.y = clampY(bounds.y)
    this.redraw()

    // Second pass: keep fixed anchor stable with actual measured text bounds
    const rotation = this.container.rotation
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    const startAnchorLocal = getFixedAnchorOffset(ctx.handle, ctx.startBounds.w, ctx.startBounds.h)
    const startCenterX = ctx.startBounds.x + ctx.startBounds.w / 2
    const startCenterY = ctx.startBounds.y + ctx.startBounds.h / 2
    const fixedAnchorWorldX = startCenterX + startAnchorLocal.x * cos - startAnchorLocal.y * sin
    const fixedAnchorWorldY = startCenterY + startAnchorLocal.x * sin + startAnchorLocal.y * cos

    const currentW = this.element.data.w
    const currentH = this.element.data.h
    const currentAnchorLocal = getFixedAnchorOffset(ctx.handle, currentW, currentH)
    const centerX = fixedAnchorWorldX - (currentAnchorLocal.x * cos - currentAnchorLocal.y * sin)
    const centerY = fixedAnchorWorldY - (currentAnchorLocal.x * sin + currentAnchorLocal.y * cos)

    this.element.x = clampX(centerX - currentW / 2)
    this.element.y = clampY(centerY - currentH / 2)
    this.redraw()
    this.transformBox?.redraw()
  }

  public redraw(): void {
    const { data } = this.element
    const textColor = this.element.style.strokeColor && this.element.style.strokeColor !== 'transparent'
      ? this.element.style.strokeColor
      : '#1f1f22'
    const textOpacity = this.element.style.opacity ?? 1

    // Update text content and style
    this.text.text = data.text
    this.text.style.fontSize = data.fontSize
    this.text.style.fontFamily = data.fontFamily
    this.text.style.fill = textColor
    this.text.alpha = textOpacity

    // Text positioned at origin within container
    this.text.x = 0
    this.text.y = 0

    // Get actual rendered dimensions
    const w = this.text.width
    const h = this.text.height

    // Update stored dimensions (auto-resize)
    this.element.data.w = w
    this.element.data.h = h

    // Container pivot at center, position at element + half size
    this.container.pivot.set(w / 2, h / 2)
    this.container.position.set(this.element.x + w / 2, this.element.y + h / 2)

    this.transformBox?.redraw()
  }

  // ─────────────────────────────────────────────────────────────
  // Type Guard
  // ─────────────────────────────────────────────────────────────

  static isTextElement(instance: AElement): instance is TextElement {
    return instance instanceof TextElement
  }

}
