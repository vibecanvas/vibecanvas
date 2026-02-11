import type { TElement, TElementData } from "@vibecanvas/shell/automerge/index";
import { Bounds, Container, FederatedPointerEvent, Graphics, Point, type Rectangle } from "pixi.js";
import type { Canvas } from "../canvas/canvas";
import {
  Change,
  createEmptySnapshot,
  type TAction,
  type TActionType,
  type TChanges,
  type TSnapshot,
} from "../types";
import { computeRotatedAABB } from "./math.util";
import type { IRenderable } from "./renderable.interface";
import type { TransformBox } from "./transform-box/transform-box";
import type { IActionable, ITransformable, TDimensions } from "./transformable.interface";
import { buildPointerContext, runCommands } from "../input-commands/command.helper";
import { InputCommand } from "../input-commands/types";

// Extract specific data type from the discriminated union based on type literal
export type ExtractElementData<T extends TElementData['type']> =
  Extract<TElementData, { type: T }>

// Narrow TBackendElement to have a specific data type
export type TBackendElementOf<T extends TElementData['type']> =
  Omit<TElement, 'data'> & { data: ExtractElementData<T> }

/**
 * Every element has a container, a data object, and a set of commands.
 * Subclasses extend and add commands they need.
 */
export abstract class AElement<
  TType extends TElementData['type'] = TElementData['type']
> implements IRenderable, ITransformable, IActionable {
  public readonly id: string
  public container: Container = new Container({ label: 'element-container' })

  // state
  protected _isSelected = false
  protected _isDragging = false
  protected _isResizing = false
  protected _isRotating = false

  // selection related
  public transformBox: TransformBox | null = null
  // debugging
  protected _debugGraphics: Graphics | null = null

  // constructor
  constructor(public element: TBackendElementOf<TType>, public canvas: Canvas) {
    this.id = element.id
    this.container.eventMode = 'static'
    this.container.cursor = 'pointer'
    this.container.rotation = element.angle
  }

  public get parentGroupId(): string | null { return this.element.parentGroupId }

  protected setupPointerListeners(listenerId: string, commands: InputCommand[]): void {
    const pointerHandler = (e: FederatedPointerEvent) => {
      e.stopPropagation()
      const ctx = buildPointerContext(this.canvas, this, e, listenerId)
      const handled = runCommands(commands, ctx)
      if (!handled && this.parentGroupId) {
        const virtualGroup = this.canvas.groupManager.groups.get(this.parentGroupId)
        virtualGroup?.container.emit(e.type, e)
      }
    }
    this.container.on('pointerdown', pointerHandler)
    this.container.on('globalpointermove', pointerHandler)
    this.container.on('pointerup', pointerHandler)
    this.container.on('pointerupoutside', pointerHandler)
    this.container.on('destroyed', () => {
      this.container.off('pointerdown', pointerHandler)
      this.container.off('globalpointermove', pointerHandler)
      this.container.off('pointerup', pointerHandler)
      this.container.off('pointerupoutside', pointerHandler)
    })
  }


  // ─────────────────────────────────────────────────────────────
  // IRenderable
  // ─────────────────────────────────────────────────────────────

  public destroy(): void {
    this.container.destroy(true)
  }

  // ─────────────────────────────────────────────────────────────
  // ISelectable
  // ─────────────────────────────────────────────────────────────

  public get isSelected(): boolean { return this._isSelected }
  public get isDragging(): boolean { return this._isDragging }
  public get isResizing(): boolean { return this._isResizing }
  public get isRotating(): boolean { return this._isRotating }

  public set isSelected(value: boolean) {
    if (value) {
      this.transformBox?.redraw()
      this.transformBox?.show()
    } else {
      this.transformBox?.hide()
    }
    this._isSelected = value
  }
  public set isDragging(value: boolean) { this._isDragging = value }
  public set isResizing(value: boolean) { this._isResizing = value }
  public set isRotating(value: boolean) { this._isRotating = value }

  // ─────────────────────────────────────────────────────────────
  // IActionable - Abstract (subclasses implement)
  // ─────────────────────────────────────────────────────────────

  /** Actions this element supports. Subclasses define their own set. */
  public abstract get supportedActions(): ReadonlySet<TActionType>

  /** Check if an action can be applied to this element. */
  public abstract canApply(action: TAction): boolean

  /** Apply an action. Updates visuals and returns changes for CRDT. */
  public abstract dispatch(action: TAction): TChanges | null

  // ─────────────────────────────────────────────────────────────
  // Snapshot (for undo/redo)
  // ─────────────────────────────────────────────────────────────

  /**
   * Capture current state for undo.
   * Returns a snapshot containing this element.
   */
  public captureSnapshot(): TSnapshot {
    const snapshot = createEmptySnapshot()
    snapshot.elements[this.id] = structuredClone(this.element) as TElement
    return snapshot
  }

  /**
   * Restore from snapshot.
   * Updates visuals and returns changes for CRDT persistence.
   */
  public restoreSnapshot(snapshot: TSnapshot): TChanges {
    const elementSnapshot = snapshot.elements[this.id]
    if (!elementSnapshot) {
      return {
        action: { type: 'restore' },
        targetId: this.id,
        timestamp: Date.now(),
        changes: [],
      }
    }

    const changes: ReturnType<typeof Change.crdt>[] = []

    // Restore position
    if (this.element.x !== elementSnapshot.x) {
      changes.push(Change.crdt(['elements', this.id, 'x'], elementSnapshot.x))
      this.element.x = elementSnapshot.x
    }
    if (this.element.y !== elementSnapshot.y) {
      changes.push(Change.crdt(['elements', this.id, 'y'], elementSnapshot.y))
      this.element.y = elementSnapshot.y
    }

    // Restore angle
    if (this.element.angle !== elementSnapshot.angle) {
      changes.push(Change.crdt(['elements', this.id, 'angle'], elementSnapshot.angle))
      this.element.angle = elementSnapshot.angle
    }

    // Restore data
    if (JSON.stringify(this.element.data) !== JSON.stringify(elementSnapshot.data)) {
      changes.push(Change.crdt(['elements', this.id, 'data'], elementSnapshot.data))
      this.element.data = elementSnapshot.data as ExtractElementData<TType>
    }

    // Restore style
    if (JSON.stringify(this.element.style) !== JSON.stringify(elementSnapshot.style)) {
      changes.push(Change.crdt(['elements', this.id, 'style'], elementSnapshot.style))
      this.element.style = elementSnapshot.style
    }

    // Sync container from element data
    this.syncContainerFromElement()
    this.redraw()

    return {
      action: { type: 'restore' },
      targetId: this.id,
      timestamp: Date.now(),
      changes,
    }
  }

  /**
   * Sync container position/rotation from element data.
   * Called after restoring from snapshot.
   */
  protected syncContainerFromElement(): void {
    const local = this.localBounds
    this.container.x = this.element.x + local.width / 2
    this.container.y = this.element.y + local.height / 2
    this.container.rotation = this.element.angle
  }

  // ─────────────────────────────────────────────────────────────
  // ITransformable - Properties
  // ─────────────────────────────────────────────────────────────

  public get backEndElement(): TBackendElementOf<TType> {
    return this.element
  }

  public get worldBounds(): Bounds {
    const local = this.localBounds
    const r = computeRotatedAABB(
      this.container.x,
      this.container.y,
      local.width,
      local.height,
      this.container.rotation
    )

    return new Bounds(r.x, r.y, r.x + r.width, r.y + r.height)
  }

  public get localBounds(): Bounds {
    return this.container.getLocalBounds()
  }

  public get worldPosition(): Point {
    return new Point(this.container.x, this.container.y)
  }

  public get rotation(): number {
    return this.container.rotation
  }

  public get localPivot(): Point {
    const local = this.localBounds
    return new Point(local.width / 2, local.height / 2)
  }

  public get worldPivot(): Point {
    return this.worldPosition
  }

  // ─────────────────────────────────────────────────────────────
  // Abstract - Shape-specific implementations
  // ─────────────────────────────────────────────────────────────

  public abstract get dimensions(): TDimensions
  public abstract set dimensions(dim: TDimensions)
  public abstract redraw(): void

  // ─────────────────────────────────────────────────────────────
  // Debug Helpers
  // ─────────────────────────────────────────────────────────────

  public debugRect(): void {
    if (this._debugGraphics) {
      this._debugGraphics.destroy()
    }

    const bounds = this.container.getLocalBounds()
    const graphics = new Graphics()
      .rect(bounds.x, bounds.y, bounds.width, bounds.height)
      .stroke({ color: 0xff0000, width: 2 })

    this._debugGraphics = graphics
    this.container.addChild(graphics)
  }

  public clearDebugRect(): void {
    if (this._debugGraphics) {
      this._debugGraphics.destroy()
      this._debugGraphics = null
    }
  }
}
