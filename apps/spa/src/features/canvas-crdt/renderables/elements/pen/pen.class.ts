import type { Canvas } from "@/features/canvas-crdt/canvas/canvas"
import { AElement, type TBackendElementOf } from "../../element.abstract"
import { Bounds, Graphics, Point } from "pixi.js"
import { TransformBox } from "../../transform-box/transform-box"
import type { TAction, TActionType, TCloneAction, TMoveAction, TRotateAction, TSetPositionAction, TSetStyleAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import { Change } from "@/features/canvas-crdt/types/changes"
import type { TDimensions } from "../../transformable.interface"
import { drawPen, computeBoundsFromPoints } from "./pen.draw"
import { cmdDragClone } from "@/features/canvas-crdt/input-commands/cmd.drag-clone"
import { cmdDragSelection, cmdRotate, cmdSelectOnClick } from "@/features/canvas-crdt/input-commands"
import type { TApplyContext } from "../rect/rect.apply-context"
import { applySelect } from "../rect/rect.apply-select"
import { applyDeselect } from "../rect/rect.apply-deselect"
import { applySetStyle } from "../rect/rect.apply-style"
import { applyDelete } from "../rect/rect.apply-delete"
import { applyClone } from "./pen.apply-clone"

const PEN_SUPPORTED_ACTIONS: ReadonlySet<TActionType> = new Set([
  'setPosition',
  'move',
  'select',
  'deselect',
  'setStyle',
  'delete',
  'rotate',
  'clone',
] as const)

/**
 * PenElement - Freehand drawing element rendered with perfect-freehand.
 *
 * ## Data Model
 * - points: Array of [x, y] coordinates relative to element position
 * - pressures: Parallel array of pressure values (0-1)
 * - simulatePressure: Whether to simulate pressure (true for mouse input)
 *
 * ## Coordinate System
 * - element.x, element.y: World position of first point
 * - points[i]: [x, y] relative to element origin
 * - First point is always [0, 0]
 *
 * ## Transform Behavior
 * - Move: Supported (translates element.x/y)
 * - Rotate: Supported (rotates around centroid of points)
 * - Resize: NOT supported (pen strokes are captured paths)
 */
export class PenElement extends AElement<'pen'> {
  protected graphics = new Graphics()

  public get supportedActions(): ReadonlySet<TActionType> {
    return PEN_SUPPORTED_ACTIONS
  }

  constructor(element: TBackendElementOf<'pen'>, canvas: Canvas) {
    super(element, canvas)
    this.container.addChild(this.graphics)
    this.container.label = 'pen-drawing-renderable-container'
    this.redraw()

    // TransformBox with rotation only (no resize handles)
    this.transformBox = new TransformBox(this, canvas, {
      cornerCommands: [],
      edgeCommands: [],
      rotationCommands: [cmdRotate],
    })
    this.container.addChild(this.transformBox.container)
    this.setupPointerListeners('pen', [cmdSelectOnClick, cmdDragClone, cmdDragSelection])
  }

  private getApplyContext(): TApplyContext<any> {
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
        return this.applySetPosition(action)
      case 'move':
        return this.applyMove(action)
      case 'select':
        return applySelect(ctx)
      case 'deselect':
        return applyDeselect(ctx)
      case 'setStyle':
        return applySetStyle(ctx, action)
      case 'delete':
        return applyDelete(ctx)
      case 'rotate':
        return this.applyRotate(action)
      case 'clone':
        return applyClone(ctx, action)
      default:
        console.warn(`PenElement: Unknown action ${action.type}`)
        return null
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Action Handlers
  // ─────────────────────────────────────────────────────────────

  private applySetPosition(action: TSetPositionAction): TChanges {
    this.element.x = action.position.x
    this.element.y = action.position.y
    this.redraw()

    return {
      action,
      targetId: this.id,
      timestamp: Date.now(),
      changes: [
        Change.crdt(['elements', this.id, 'x'], this.element.x),
        Change.crdt(['elements', this.id, 'y'], this.element.y),
      ],
    }
  }

  private applyMove(action: TMoveAction): TChanges {
    this.element.x = this.element.x + action.delta.x
    this.element.y = this.element.y + action.delta.y
    this.container.x += action.delta.x
    this.container.y += action.delta.y

    return {
      action,
      targetId: this.id,
      timestamp: Date.now(),
      changes: [
        Change.crdt(['elements', this.id, 'x'], this.element.x),
        Change.crdt(['elements', this.id, 'y'], this.element.y),
      ],
    }
  }

  /**
   * Apply rotation around the geometric center (centroid) of all points.
   *
   * Math:
   * - Let C_local = geometric center in local space (average of points)
   * - Before: worldCenter = element.xy + rotate(C_local, oldAngle)
   * - After:  worldCenter = newElement.xy + rotate(C_local, newAngle)
   * - We want worldCenter to stay the same, so:
   *   newElement.xy = element.xy + rotate(C_local, oldAngle) - rotate(C_local, newAngle)
   */
  private applyRotate(action: TRotateAction): TChanges {
    const points = this.element.data.points
    if (points.length === 0) {
      this.element.angle = action.angle
      this.redraw()
      return {
        action,
        targetId: this.id,
        timestamp: Date.now(),
        changes: [Change.crdt(['elements', this.id, 'angle'], this.element.angle)],
      }
    }

    const oldAngle = this.element.angle
    const newAngle = action.angle

    // Calculate centroid in local space
    let sumX = 0, sumY = 0
    for (const [x, y] of points) {
      sumX += x
      sumY += y
    }
    const localCenterX = sumX / points.length
    const localCenterY = sumY / points.length

    // Calculate where center was in world space (before rotation change)
    const cosOld = Math.cos(oldAngle)
    const sinOld = Math.sin(oldAngle)
    const oldWorldCenterX = localCenterX * cosOld - localCenterY * sinOld + this.element.x
    const oldWorldCenterY = localCenterX * sinOld + localCenterY * cosOld + this.element.y

    // Calculate where center would be with new angle (without translating)
    const cosNew = Math.cos(newAngle)
    const sinNew = Math.sin(newAngle)
    const newWorldCenterX = localCenterX * cosNew - localCenterY * sinNew + this.element.x
    const newWorldCenterY = localCenterX * sinNew + localCenterY * cosNew + this.element.y

    // Translate position to keep center stationary
    this.element.x += oldWorldCenterX - newWorldCenterX
    this.element.y += oldWorldCenterY - newWorldCenterY
    this.element.angle = newAngle

    this.redraw()

    return {
      action,
      targetId: this.id,
      timestamp: Date.now(),
      changes: [
        Change.crdt(['elements', this.id, 'x'], this.element.x),
        Change.crdt(['elements', this.id, 'y'], this.element.y),
        Change.crdt(['elements', this.id, 'angle'], this.element.angle),
      ],
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Dimensions
  // ─────────────────────────────────────────────────────────────

  get dimensions(): TDimensions {
    const bounds = computeBoundsFromPoints(this.element.data.points)
    return { w: bounds.width || 1, h: bounds.height || 1 }
  }

  set dimensions(_dim: TDimensions) {
    // Pen strokes don't support resize - dimensions are derived from points
    console.warn('PenElement: dimensions setter called but pen does not support resize')
  }

  // ─────────────────────────────────────────────────────────────
  // Bounds
  // ─────────────────────────────────────────────────────────────

  /**
   * Returns the geometric center of the stroke in world space.
   * Used by TransformBox for rotation pivot.
   */
  public override get worldPosition(): Point {
    const points = this.element.data.points
    if (points.length === 0) {
      return new Point(this.element.x, this.element.y)
    }

    // Calculate centroid in local space
    let sumX = 0, sumY = 0
    for (const [x, y] of points) {
      sumX += x
      sumY += y
    }
    const localCenterX = sumX / points.length
    const localCenterY = sumY / points.length

    // Transform to world space
    const angle = this.element.angle
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const worldCenterX = localCenterX * cos - localCenterY * sin + this.element.x
    const worldCenterY = localCenterX * sin + localCenterY * cos + this.element.y

    return new Point(worldCenterX, worldCenterY)
  }

  /**
   * Returns AABB in world space computed from transformed points.
   * Used for selection box hit-testing.
   */
  public override get worldBounds(): Bounds {
    const points = this.element.data.points
    if (points.length === 0) {
      return new Bounds(this.element.x, this.element.y, this.element.x, this.element.y)
    }

    const angle = this.element.angle
    const originX = this.element.x
    const originY = this.element.y
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity

    for (const [lx, ly] of points) {
      const worldX = lx * cos - ly * sin + originX
      const worldY = lx * sin + ly * cos + originY
      minX = Math.min(minX, worldX)
      minY = Math.min(minY, worldY)
      maxX = Math.max(maxX, worldX)
      maxY = Math.max(maxY, worldY)
    }

    // Add padding for stroke width
    const padding = (this.element.style.strokeWidth ?? 4) / 2
    return new Bounds(minX - padding, minY - padding, maxX + padding, maxY + padding)
  }

  /**
   * Local bounds for TransformBox (origin at 0,0).
   */
  public override get localBounds() {
    const bounds = computeBoundsFromPoints(this.element.data.points)
    const padding = (this.element.style.strokeWidth ?? 4) / 2
    const minHitPadding = 10

    // Ensure minimum clickable area
    const width = Math.max(bounds.width + padding * 2, minHitPadding * 2)
    const height = Math.max(bounds.height + padding * 2, minHitPadding * 2)

    return new Bounds(0, 0, width, height)
  }

  // ─────────────────────────────────────────────────────────────
  // Redraw
  // ─────────────────────────────────────────────────────────────

  redraw(): void {
    drawPen({ graphics: this.graphics, element: this.element })

    const points = this.element.data.points
    if (points.length === 0) {
      this.container.x = this.element.x
      this.container.y = this.element.y
      this.container.rotation = this.element.angle
      return
    }

    const bounds = computeBoundsFromPoints(points)
    const padding = (this.element.style.strokeWidth ?? 4) / 2

    // Calculate centroid for pivot
    let sumX = 0, sumY = 0
    for (const [x, y] of points) {
      sumX += x
      sumY += y
    }
    const centroidX = sumX / points.length
    const centroidY = sumY / points.length

    // Offset graphics so content aligns within local bounds
    // Graphics are drawn at point coordinates, so offset to handle bounds.x/y
    this.graphics.x = -bounds.x + padding
    this.graphics.y = -bounds.y + padding

    // Pivot at centroid (within graphics offset space)
    this.container.pivot.set(centroidX - bounds.x + padding, centroidY - bounds.y + padding)

    // Container position = world position of centroid
    const angle = this.element.angle
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    this.container.x = this.element.x + (centroidX * cos - centroidY * sin)
    this.container.y = this.element.y + (centroidX * sin + centroidY * cos)
    this.container.rotation = angle

  }

  // ─────────────────────────────────────────────────────────────
  // Static
  // ─────────────────────────────────────────────────────────────

  static isPenElement(instance: AElement): instance is PenElement {
    return instance instanceof PenElement
  }
}
