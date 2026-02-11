import type { Canvas } from "@/features/canvas-crdt/canvas/canvas";
import { AElement, type TBackendElementOf } from "../../element.abstract";
import { Bounds, Graphics, Point } from "pixi.js";
import { TransformBox } from "../../transform-box/transform-box";
import type { TAction, TActionType, TCloneAction, TMoveAction, TRotateAction, TSetPositionAction, TSetStyleAction } from "@/features/canvas-crdt/types/actions";
import type { TChanges } from "@/features/canvas-crdt/types/changes";
import type { TDimensions } from "../../transformable.interface";
import { computeBoundsFromPoints } from "../../math.util";
import { drawLine, drawAnchorPoints, drawMidpoints } from "./line.draw";
import { cmdDragClone } from "@/features/canvas-crdt/input-commands/cmd.drag-clone";
import { cmdDragSelection, cmdRotate, cmdSelectOnClick } from "@/features/canvas-crdt/input-commands";
import { applySelect } from "../rect/rect.apply-select";
import { applyDeselect } from "../rect/rect.apply-deselect";
import { applySetStyle } from "../rect/rect.apply-style";
import { applyDelete } from "../rect/rect.apply-delete";
import { applyClone } from "./line.apply-clone";
import type { TLineApplyContext } from "./line.apply-context";
import { applySetPosition } from "./line.apply-position";
import { applyMove } from "./line.apply-move";
import { applyRotate } from "./line.apply-rotate";
import { applyEnter } from "./line.apply-enter";
import { attachAnchorHandlers } from "./line.anchor-handlers";
import { attachMidpointHandlers } from "./line.midpoint-handlers";
import { getWorldPosition, getWorldBounds, getExpansionOffset } from "./line.bounds";

const LINE_SUPPORTED_ACTIONS: ReadonlySet<TActionType> = new Set([
  'setPosition',
  'move',
  'select',
  'deselect',
  'setStyle',
  'delete',
  'rotate',
  'enter',
  'clone',
] as const)

/**
 * LineElement - A polyline/polygon canvas element with editable anchor points.
 *
 * ## State Machine
 *
 * LineElement has two key state dimensions:
 * 1. Selection state (`_isSelected`) - whether the element is selected
 * 2. Edit mode (`_isEditMode`) - whether the user is editing vertices
 *
 * ## Visibility Behavior Matrix
 *
 * | State                          | Transform Box | Anchors | Midpoints |
 * |--------------------------------|---------------|---------|-----------|
 * | Not selected                   | ❌ Hidden     | ❌ Hidden | ❌ Hidden |
 * | Selected (2 points)            | ❌ Hidden     | ✅ Shown  | ✅ Shown  |
 * | Selected (3+ points)           | ✅ Shown      | ✅ Shown  | ❌ Hidden |
 * | Selected (3+ points) + Edit    | ❌ Hidden     | ✅ Shown  | ✅ Shown  |
 *
 * ## User Interactions
 *
 * ### Simple Line (2 points)
 * - Select: Shows anchor points at start/end, plus midpoint in center
 * - Drag anchor: Moves that endpoint
 * - Drag midpoint: Inserts new point, enters edit mode
 *
 * ### Multi-Point Line (Normal Mode)
 * - Select: Shows transform box for resize/rotate, plus anchor points
 * - Midpoints hidden to avoid clutter
 * - Use transform box to resize/rotate entire line
 *
 * ### Multi-Point Line (Edit Mode)
 * - Enter via double-click (dispatches 'enter' action)
 * - Or automatically when dragging a midpoint
 * - Transform box hidden, midpoints shown
 * - Can drag anchors to reshape, drag midpoints to add more vertices
 * - Exit by deselecting (click elsewhere)
 *
 * ## Coordinate System
 *
 * - `element.x, element.y` - World position of line start point
 * - `points[i]` - Array of [x, y] relative to element position
 *   - points[0] is always [0, 0] (the start point, explicit)
 *   - points[1..n] are subsequent anchor points
 * - Curves are auto-computed at render time (Catmull-Rom → Bezier)
 *
 * ## Bounds Expansion
 *
 * Lines can be very thin (e.g., horizontal line has height=0).
 * We expand bounds for:
 * 1. Hit detection (MIN_HIT_PADDING ensures clickable area)
 * 2. Anchor visibility (ANCHOR_PADDING for anchor circles extending beyond line)
 */
export class LineElement extends AElement<'line'> {
  protected graphics = new Graphics()
  /** Pool of Graphics objects for anchor point circles (one per point) */
  protected anchorGraphics: Graphics[] = []
  /** Pool of Graphics objects for midpoint circles (center of each segment) */
  protected midpointGraphics: Graphics[] = []
  /** When true, shows midpoints for vertex editing even on multi-point lines */
  protected _isEditMode = false

  public get supportedActions(): ReadonlySet<TActionType> {
    return LINE_SUPPORTED_ACTIONS
  }

  constructor(element: TBackendElementOf<'line'>, canvas: Canvas) {
    super(element, canvas)
    this.container.addChild(this.graphics)
    this.container.label = 'line-drawing-renderable-container'
    this.container.sortableChildren = true
    this.redraw()

    this.setupAnchorPoints()
    this.setupMidpoints()
    // TransformBox uses this.localBounds which is expanded for thin lines
    // This ensures handles don't overlap the hit area
    this.transformBox = new TransformBox(this, canvas, {
      cornerCommands: [],
      edgeCommands: [],
      rotationCommands: [cmdRotate],
    })
    this.container.addChild(this.transformBox.container)
    this.setupPointerListeners('line', [cmdSelectOnClick, cmdDragClone, cmdDragSelection])
  }

  /**
   * Transform a world-space delta to local-space delta.
   * Accounts for the element's rotation angle.
   */
  private worldDeltaToLocal(worldDeltaX: number, worldDeltaY: number): { x: number; y: number } {
    const angle = this.element.angle
    const cosA = Math.cos(-angle) // Negative to undo rotation
    const sinA = Math.sin(-angle)
    return {
      x: worldDeltaX * cosA - worldDeltaY * sinA,
      y: worldDeltaX * sinA + worldDeltaY * cosA,
    }
  }

  private setupAnchorPoints(): void {
    drawAnchorPoints({
      pool: this.anchorGraphics,
      element: this.element,
      graphicsOffset: { x: this.graphics.x, y: this.graphics.y },
    })
    this.reparentAnchorPoints()
  }

  /**
   * Builds context and attaches anchor drag handlers to a Graphics object.
   */
  private buildAnchorHandlers(g: Graphics): void {
    attachAnchorHandlers(g, {
      getElement: () => this.element,
      id: this.id,
      canvas: this.canvas,
      anchorGraphics: this.anchorGraphics,
      redraw: () => this.redraw(),
      worldDeltaToLocal: (dx, dy) => this.worldDeltaToLocal(dx, dy),
    })
  }

  private setupMidpoints(): void {
    drawMidpoints({
      pool: this.midpointGraphics,
      element: this.element,
      graphicsOffset: { x: this.graphics.x, y: this.graphics.y },
    })
    this.reparentMidpoints()
  }

  private reparentMidpoints(): void {
    for (const g of this.midpointGraphics) {
      if (!g.parent) {
        this.container.addChild(g)
      }

      // Attach handlers if not already attached (using custom property as marker)
      if (!(g as any)._hasMidpointHandlers) {
        this.buildMidpointHandlers(g)
        ;(g as any)._hasMidpointHandlers = true
      }
    }
  }

  /**
   * Builds context and attaches midpoint drag handlers to a Graphics object.
   */
  private buildMidpointHandlers(g: Graphics): void {
    attachMidpointHandlers(g, {
      getElement: () => this.element,
      id: this.id,
      canvas: this.canvas,
      midpointGraphics: this.midpointGraphics,
      redraw: () => this.redraw(),
      worldDeltaToLocal: (dx, dy) => this.worldDeltaToLocal(dx, dy),
      setEditMode: (value) => { this._isEditMode = value; this.updateVisibility() },
    })
  }

  private getApplyContext(): TLineApplyContext {
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
      setEditMode: (value: boolean) => { this._isEditMode = value; this.updateVisibility() },
    }
  }

  canApply(action: TAction): boolean {
    return this.supportedActions.has(action.type as TActionType)
  }

  dispatch(action: TAction): TChanges | null {
    if (!this.canApply(action)) return null

    const ctx = this.getApplyContext()

    switch (action.type) {
      case 'setPosition':
        return applySetPosition(ctx, action as TSetPositionAction)
      case 'move':
        return applyMove(ctx, action as TMoveAction)
      case 'select':
        return applySelect(ctx)
      case 'deselect':
        return applyDeselect(ctx)
      case 'setStyle':
        return applySetStyle(ctx, action as TSetStyleAction)
      case 'delete':
        return applyDelete(ctx)
      case 'rotate':
        return applyRotate(ctx, action as TRotateAction)
      case 'enter':
        return applyEnter(ctx)
      case 'clone':
        return applyClone(ctx, action as TCloneAction)
      default:
        console.warn(`LineElement: Unknown action ${action.type}`)
        return null
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Dimensions
  // ─────────────────────────────────────────────────────────────

  get dimensions(): TDimensions {
    const points = this.element.data.points
    const bounds = computeBoundsFromPoints(points)
    return { w: bounds.width, h: bounds.height }
  }

  set dimensions(dim: TDimensions) {
    const points = this.element.data.points
    const currentBounds = computeBoundsFromPoints(points)
    if (currentBounds.width === 0 || currentBounds.height === 0) return

    const scaleX = dim.w / currentBounds.width
    const scaleY = dim.h / currentBounds.height

    // Scale all points relative to bounds origin
    for (const point of points) {
      point[0] = currentBounds.x + (point[0] - currentBounds.x) * scaleX
      point[1] = currentBounds.y + (point[1] - currentBounds.y) * scaleY
    }

    this.redraw()
  }

  // ─────────────────────────────────────────────────────────────
  // Local Bounds (expanded for hit detection)
  // ─────────────────────────────────────────────────────────────

  /**
   * Override worldPosition to return the geometric center of the line.
   * Used by TransformBox.getCenter() for rotation.
   */
  public override get worldPosition(): Point {
    return getWorldPosition(this.element)
  }

  /**
   * Override worldBounds to return an axis-aligned bounding box (AABB)
   * computed from actual anchor points transformed to world space.
   */
  public override get worldBounds(): Bounds {
    return getWorldBounds(this.element)
  }

  /**
   * Returns bounds with (0, 0) origin for TransformBox compatibility.
   */
  public override get localBounds() {
    const expansion = this.getExpansionOffsetValues()
    return new Bounds(0, 0, expansion.width, expansion.height)
  }

  /**
   * Calculate expansion offset for centering line within expanded bounds.
   */
  protected getExpansionOffsetValues(): { x: number; y: number; width: number; height: number } {
    return getExpansionOffset(this.graphics)
  }

  // ─────────────────────────────────────────────────────────────
  // Redraw
  // ─────────────────────────────────────────────────────────────

  redraw(): void {
    drawLine({ lineGraphics: this.graphics, element: this.element })

    const graphicsBounds = this.graphics.getLocalBounds()
    const expansion = this.getExpansionOffsetValues()

    // Graphics offset to position line start at a known location within expanded bounds
    // Line starts at points[0] which is (0,0) in graphics space
    const offsetX = -graphicsBounds.x + expansion.x
    const offsetY = -graphicsBounds.y + expansion.y
    this.graphics.x = offsetX
    this.graphics.y = offsetY

    // For lines, we use the START POINT as the pivot/anchor for rotation.
    // This ensures that when we edit other anchors, the line doesn't translate.
    // The start point in container space is at (offsetX, offsetY) since line starts at (0,0).
    const pivotX = offsetX  // Start point X in container space
    const pivotY = offsetY  // Start point Y in container space
    this.container.pivot.set(pivotX, pivotY)

    // Position container so the start point (pivot) is at element.x, element.y in world space
    this.container.x = this.element.x
    this.container.y = this.element.y
    this.container.rotation = this.element.angle

    // Draw anchor points (pool management + positioning)
    drawAnchorPoints({
      pool: this.anchorGraphics,
      element: this.element,
      graphicsOffset: { x: offsetX, y: offsetY },
    })
    this.reparentAnchorPoints()

    // Draw midpoints (pool management + positioning)
    drawMidpoints({
      pool: this.midpointGraphics,
      element: this.element,
      graphicsOffset: { x: offsetX, y: offsetY },
    })
    this.reparentMidpoints()

    // Update visibility based on selection and edit mode state
    this.updateVisibility()
  }

  /**
   * Selection state setter.
   * - When selected: shows appropriate UI based on point count and edit mode
   * - When deselected: exits edit mode and hides all UI elements
   */
  public set isSelected(value: boolean) {
    this._isSelected = value

    if (!value) {
      // Deselecting - exit edit mode
      this._isEditMode = false
    }

    this.updateVisibility()
  }

  /**
   * Updates visibility of UI elements based on current state.
   *
   * Logic:
   * - Transform box: shown only for multi-point lines (3+) NOT in edit mode
   * - Anchors: always shown when selected (for all line types)
   * - Midpoints: shown for simple line (2 points) OR when in edit mode
   *
   * This implements the visibility matrix documented in the class JSDoc.
   */
  private updateVisibility(): void {
    const points = this.element.data.points
    const isSimpleLine = points.length === 2  // Just start and end
    const showMidpoints = this._isSelected && (isSimpleLine || this._isEditMode)

    // Transform box: only for multi-point AND not in edit mode
    if (this._isSelected && !isSimpleLine && !this._isEditMode) {
      this.transformBox?.show()
      this.transformBox?.redraw() // Ensure bounds are updated
    } else {
      this.transformBox?.hide()
    }

    // Anchors: always when selected
    this.anchorGraphics.forEach(g => g.visible = this._isSelected)

    // Midpoints: only for simple line OR edit mode
    this.midpointGraphics.forEach(g => g.visible = showMidpoints)
  }


  private reparentAnchorPoints(): void {
    for (const g of this.anchorGraphics) {
      if (!g.parent) {
        g.zIndex = 100
        this.container.addChild(g)
      }
      // Attach handlers if not already attached (using custom property as marker)
      if (!(g as any)._hasAnchorHandlers) {
        this.buildAnchorHandlers(g)
        ;(g as any)._hasAnchorHandlers = true
      }
    }
  }


  private clearAnchorPoints(): void {
    for (const g of this.anchorGraphics) {
      this.container.removeChild(g)
      g.destroy()
    }
    this.anchorGraphics.length = 0
  }

  // Debug: Visualize the hit area (green rectangle)
  public debugHitArea(): void {
    if (this._debugGraphics) this._debugGraphics.destroy()

    const bounds = this.localBounds
    const graphics = new Graphics()
      .rect(bounds.x, bounds.y, bounds.width, bounds.height)
      .stroke({ color: 0x00ff00, width: 1 })

    this._debugGraphics = graphics
    this.container.addChild(graphics)
  }

  // ─────────────────────────────────────────────────────────────
  // Static
  // ─────────────────────────────────────────────────────────────

  static isLineElement(instance: AElement): instance is LineElement {
    return instance instanceof LineElement
  }
}
