import type { Canvas } from "@/features/canvas-crdt/canvas/canvas";
import { cmdResize, cmdRotate } from "@/features/canvas-crdt/input-commands";
import { cmdDragClone } from "@/features/canvas-crdt/input-commands/cmd.drag-clone";
import { Graphics, Point, Rectangle } from "pixi.js";
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
import { calculateRotatedResize } from "../rect/rect.math";
// Reuse apply functions from rect (same w/h structure)
import { clampSize, clampX, clampY, type TApplyContextWH } from "../rect/rect.apply-context";
import { applyMove } from "../rect/rect.apply-move";
import { applyRotate } from "../rect/rect.apply-rotate";
import { applySetPosition } from "../rect/rect.apply-position";
import { applyScale } from "../rect/rect.apply-scale";
import { applyResize } from "../rect/rect.apply-resize";
import { applySelect } from "../rect/rect.apply-select";
import { applyDeselect } from "../rect/rect.apply-deselect";
import { applySetStyle } from "../rect/rect.apply-style";
import { applyDelete } from "./chat.apply-delete";
import { applyClone } from "../rect/rect.apply-clone";
import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { applyChangesToCRDT } from "@/features/canvas-crdt/changes";
import { CONNECTION_STATE } from "./chat.state-machine";

const commands = [cmdSelectOnClick, cmdDragClone, cmdDragSelection]

type TChatBounds = {
  x: number
  y: number
  w: number
  h: number
  angle: number
  scale: number
}

/** Actions supported by ChatElement */
const CHAT_SUPPORTED_ACTIONS: ReadonlySet<TActionType> = new Set([
  // Transform actions
  'setPosition',
  'move',
  'rotate',
  'scale',
  'resize',
  'clone',
  'delete',
  // Selection actions
  'select',
  'deselect',
  // Style actions
  'setStyle',
] as const)

export class ChatElement extends AElement<'chat'> {
  private graphics: Graphics = new Graphics()
  private overlayDiv: HTMLDivElement | null = null
  private setBounds: ((bounds: TChatBounds) => void) | null = null
  private setState: ((state: CONNECTION_STATE) => void) | null = null
  private tickerCallback: (() => void) | null = null

  constructor(element: TBackendElementOf<'chat'>, canvas: Canvas) {
    super(element, canvas)
    this.container.addChild(this.graphics)
    this.container.label = 'chat-drawing-renderable-container'
    this.redraw()

    this.transformBox = new TransformBox(this, canvas, {
      cornerCommands: [cmdResize],
      edgeCommands: [cmdResize],
      rotationCommands: [cmdRotate],
    })
    this.container.addChild(this.transformBox.container)
    this.setupPointerListeners('chat', commands)

    void this.renderChatComponent()
    this.setupViewportSync()
  }

  private async renderChatComponent() {
    if (typeof document === "undefined") return

    const div = document.createElement('div')
    div.id = `Chat:${this.element.id}`
    this.overlayDiv = div

    const chatEntrypoint = document.querySelector('#canvas-overlay-entrypoint')!
    chatEntrypoint.appendChild(div)

    // Create signal for reactive bounds
    const [bounds, setBounds] = createSignal<TChatBounds>(this.getScreenBounds())
    this.setBounds = setBounds

    // Create signal for reactive state
    const [state, setState] = createSignal<CONNECTION_STATE>(CONNECTION_STATE.NOT_CONNECTED)
    this.setState = setState

    let lastDragMovement: TChanges | null = null
    const storeModule = await import("@/store")
    const canvasActive = storeModule.store.canvasSlice.backendCanvasActive
    if(!canvasActive) throw new Error('No Canvas is not active')

    const chatModule = await import("@/features/chat/components/chat")
    const Chat = chatModule.Chat

    render(() => Chat({
      bounds,
      state,
      setState,
      chatClass: this,
      canvas: canvasActive,
      chatId: this.element.id,
      onSelect: () => applySelect(this.getApplyContext()),
      onDrag: ({ x, y }) => {
        // Get fresh context each time - this.element may have been replaced by CRDT sync
        lastDragMovement = applyMove(this.getApplyContext(), {delta: new Point(x, y), type: 'move'})
      },
      onDragEnd: () => {
        if (lastDragMovement) {
          applyChangesToCRDT(this.canvas.handle, [lastDragMovement])
          lastDragMovement = null
        }

      },
      onDragStart: () => {

      }
    }), div)


    this.container.on('destroyed', () => {
      this.cleanupOverlay()
    })
  }

  private setupViewportSync() {
    // Use ticker to sync overlay position with viewport changes (pan/zoom)
    this.tickerCallback = () => {
      this.updateOverlayBounds()
    }
    this.canvas.app.ticker.add(this.tickerCallback)
  }

  private getScreenBounds(): TChatBounds {
    const { w, h } = this.element.data
    const scale = this.canvas.app.stage.scale.x

    // Get center position in screen space (container.x/y is already the center)
    const center = this.canvas.app.stage.toGlobal({ x: this.container.x, y: this.container.y })

    return {
      x: center.x,
      y: center.y,
      w: w,      // Unscaled - CSS transform handles scaling
      h: h,      // Unscaled - CSS transform handles scaling
      angle: this.element.angle,
      scale,
    }
  }

  private updateOverlayBounds() {
    if (this.setBounds) {
      this.setBounds(this.getScreenBounds())
    }
  }

  private cleanupOverlay() {
    if (this.tickerCallback) {
      this.canvas.app.ticker.remove(this.tickerCallback)
      this.tickerCallback = null
    }
    if (this.overlayDiv) {
      this.overlayDiv.remove()
      this.overlayDiv = null
    }
  }


  // ─────────────────────────────────────────────────────────────
  // IActionable Implementation
  // ─────────────────────────────────────────────────────────────

  public get supportedActions(): ReadonlySet<TActionType> {
    return CHAT_SUPPORTED_ACTIONS
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

  // ─────────────────────────────────────────────────────────────
  // ITransformable
  // ─────────────────────────────────────────────────────────────

  public get dimensions(): TDimensions {
    return { w: this.container.width, h: this.container.height }
  }

  public set dimensions(dim: TDimensions) {
    const w = clampSize(dim.w)
    const h = clampSize(dim.h)
    this.container.width = w
    this.container.height = h
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

    const { w, h } = this.element.data
    const { opacity } = this.element.style

    this.container.alpha = opacity ?? 1
    this.container.pivot.set(w / 2, h / 2)
    this.container.position.set(this.element.x + w / 2, this.element.y + h / 2)
    this.container.boundsArea = new Rectangle(0, 0, w, h)

  }

  // ─────────────────────────────────────────────────────────────
  // Own Methods
  // ─────────────────────────────────────────────────────────────

  static isChatElement(instance: AElement): instance is ChatElement {
    return instance instanceof ChatElement
  }



}
