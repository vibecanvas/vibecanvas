import type { TGroup } from "@vibecanvas/shell"
import { Bounds, Container, type FederatedPointerEvent, Point, Rectangle } from "pixi.js"
import type { Canvas, TGroupMember } from "../canvas/canvas"
import { cmdDragSelection } from "../input-commands/cmd.drag-selection"
import { cmdScale } from "../input-commands/cmd.scale"
import {
  Change,
  type TAction,
  type TActionType,
  type TChange,
  type TChanges,
  type TSnapshot,
  createEmptySnapshot,
} from "../types"
import type { AElement } from "./element.abstract"
import { TransformBox } from "./transform-box/transform-box"
import { computeBoundingBox } from "./transform-box/transform-box.math"
import type { ITransformable, TDimensions, TTransformBoxMode } from "./transformable.interface"
import { cmdRotate, cmdSelectOnClick } from "../input-commands"
import type { TCloneAction } from "../types/actions"
import { cmdDragClone } from "../input-commands/cmd.drag-clone"
import { buildPointerContext, runCommands } from "../input-commands/command.helper"

// ─────────────────────────────────────────────────────────────
// GROUP MEMBER TYPE & TYPE GUARDS
// ─────────────────────────────────────────────────────────────

/** Type guard for VirtualGroup */
export function isVirtualGroup(member: TGroupMember): member is VirtualGroup {
  return 'group' in member && 'members' in member
}

/** Type guard for AElement */
export function isElement(member: TGroupMember): member is AElement {
  return 'element' in member && !('group' in member)
}

/**
 * VirtualGroup implements ITransformable to be selected/transformed like elements.
 * It has its own TransformBox and container positioned at group center.
 *
 * Key design:
 * - container is positioned at group center (worldPosition)
 * - transformBox is a child of container (like AElement)
 * - localBounds is relative to container center (for TransformBox drawing)
 * - dispatch(action) delegates to all members, aggregates TChanges
 */
export class VirtualGroup implements ITransformable {
  public readonly id: string

  // Container for the TransformBox (positioned at group center)
  public container: Container = new Container({ label: 'virtual-group-container', eventMode: 'static' })

  // ISelectable state
  public isSelected = false
  public isDragging = false
  public isResizing = false
  public isRotating = false

  // TransformBox for when group is selected (like AElement has)
  public transformBox: TransformBox | null = null

  // Cached member references (resolved on access)
  private _members: TGroupMember[] | null = null
  private _bounds: Bounds | null = null

  // Scale operation cache - tracks member initial bounds per scale gesture
  private _scaleCache: {
    groupInitialBounds: { x: number; y: number; w: number; h: number }
    memberInitialBounds: Map<string, { x: number; y: number; w: number; h: number }>
  } | null = null

  constructor(
    public readonly group: TGroup,
    private readonly canvas: Canvas,
  ) {
    this.id = group.id

    // Create TransformBox for this group with scale commands for corners
    // (groups use scale instead of resize for uniform scaling of all members)
    this.transformBox = new TransformBox(this, canvas, {
      cornerCommands: [cmdScale],
      edgeCommands: [cmdScale],
      rotationCommands: [cmdRotate],
    })
    this.container.addChild(this.transformBox.container)

    // Attach drag command to container (for when user drags the frame)
    this.setupListeners()
  }

  private setupListeners(): void {
    const commands = [cmdSelectOnClick, cmdDragClone, cmdDragSelection]
    const pointerHandler = (e: FederatedPointerEvent) => {
      e.stopPropagation()
      const ctx = buildPointerContext(this.canvas, this, e, 'virtual-group')
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
  // MEMBER RESOLUTION
  // ─────────────────────────────────────────────────────────────

  public get parentGroupId(): string | null { return this.group.parentGroupId }

  /** Get member elements (resolved from canvas.elements) */
  public get members(): TGroupMember[] {
    if (!this._members) {
      this._members = this.canvas.groupManager.findMembersForGroup(this.id)
    }
    return this._members
  }

  /** Invalidate cached members and bounds (call when membership changes) */
  public invalidateMembers(): void {
    this._members = null
    this._bounds = null
    // NOTE: Don't clear _scaleCache here - it's managed by handleScale()
    // Clearing it here would cause scale to recapture from already-scaled positions
  }

  /** Clear scale cache (call at END of scale gesture, not during) */
  public clearScaleCache(): void {
    this._scaleCache = null
  }

  /**
   * Recursively get all leaf elements in this group and nested groups.
   * Use when you need actual elements for CRDT changes.
   */
  public getAllElements(): AElement[] {
    const elements: AElement[] = []

    for (const member of this.members) {
      if (isVirtualGroup(member)) {
        elements.push(...member.getAllElements())
      } else {
        elements.push(member)
      }
    }

    return elements
  }

  // ─────────────────────────────────────────────────────────────
  // COMPUTED BOUNDS (aggregated from members)
  // ─────────────────────────────────────────────────────────────

  private computeBounds(): Bounds {
    if (this._bounds) return this._bounds
    if (this.members.length === 0) {
      this._bounds = new Bounds()
      return this._bounds
    }
    this._bounds = computeBoundingBox(this.members.map(m => m.worldBounds))
    return this._bounds
  }

  /** World bounds (AABB of all members) */
  public get worldBounds(): Bounds {
    return this.computeBounds()
  }

  /**
   * Local bounds - relative to container center.
   * TransformBox uses this to draw the frame.
   * Since container is at group center, local bounds are (0, 0, w, h).
   * TransformBox will draw around this.
   */
  public get localBounds(): Bounds {
    const wb = this.computeBounds()
    // Return bounds as if origin is at top-left corner (like elements do)
    // TransformBox expects localBounds.x and localBounds.y to be the top-left offset
    return {
      x: 0,
      y: 0,
      width: wb.width,
      height: wb.height,
    } as Bounds
  }

  /** World position - center of group bounds */
  public get worldPosition(): Point {
    const b = this.computeBounds()
    return new Point(b.x + b.width / 2, b.y + b.height / 2)
  }

  /** Groups don't have rotation - individual members do */
  public get rotation(): number {
    return 0
  }

  public get worldPivot(): Point {
    return this.worldPosition
  }

  public get localPivot(): Point {
    const b = this.localBounds
    return new Point(b.width / 2, b.height / 2)
  }

  public get dimensions(): TDimensions {
    const b = this.computeBounds()
    return { w: b.width, h: b.height }
  }

  public set dimensions(_dim: TDimensions) {
    // Groups don't have direct dimensions - they're computed from members
  }

  // ─────────────────────────────────────────────────────────────
  // IActionable - Action Support
  // ─────────────────────────────────────────────────────────────

  public supportedActions: ReadonlySet<TActionType> = new Set<TActionType>([
    'group',
    'ungroup',
    'addToGroup',
    'removeFromGroup',
    'rotate',
    'scale',
    'select',
    'move',
    'clone',
    'delete',
  ])

  /** Check if action can be applied to all members */
  public canApply(action: TAction): boolean {
    return this.supportedActions.has(action.type)
  }

  /**
   * Dispatch action to all members and aggregate changes.
   */
  public dispatch(action: TAction): TChanges | null {
    if (!this.canApply(action)) return null

    let allChanges: TChange[] = []

    switch (action.type) {
      case 'move':
        for (const member of this.members) {
          const result = member.dispatch(action)
          if (result) {
            allChanges.push(...result.changes)
          }
        }
        break

      case 'scale':
        allChanges = this.handleScale(action)
        break
      case 'clone':
        allChanges = this.handleClone(action)
        break
      case 'delete':
        allChanges = this.handleDelete()
        break
      default:
        throw new Error(`Not implemented in group: ${action.type}`)
    }

    // Invalidate bounds after action
    this._bounds = null

    return {
      action,
      targetId: this.id,
      timestamp: Date.now(),
      changes: allChanges,
    }
  }

  /**
   * Handle scale action - each member needs its OWN initial bounds.
   * On first dispatch of a new scale gesture, capture each member's bounds.
   */
  private handleScale(
    action: { type: 'scale'; factor: number; center: Point; initialBounds: { x: number; y: number; w: number; h: number } },
  ): TChange[] {
    const allChanges: TChange[] = []
    const groupBounds = action.initialBounds

    // Check if this is a new scale operation (different group initial bounds)
    const isNewScaleOperation = !this._scaleCache ||
      this._scaleCache.groupInitialBounds.x !== groupBounds.x ||
      this._scaleCache.groupInitialBounds.y !== groupBounds.y ||
      this._scaleCache.groupInitialBounds.w !== groupBounds.w ||
      this._scaleCache.groupInitialBounds.h !== groupBounds.h

    if (isNewScaleOperation) {
      // New scale operation - capture each member's current bounds
      this._scaleCache = {
        groupInitialBounds: { ...groupBounds },
        memberInitialBounds: new Map(),
      }

      for (const member of this.members) {
        const bounds = member.worldBounds
        this._scaleCache.memberInitialBounds.set(member.id, {
          x: bounds.x,
          y: bounds.y,
          w: bounds.width,
          h: bounds.height,
        })
      }
    }

    // Dispatch scale to each member with their OWN initial bounds
    // but use the GROUP's center (fixed corner) so elements move + resize proportionally
    for (const member of this.members) {
      const memberInitialBounds = this._scaleCache!.memberInitialBounds.get(member.id)
      if (!memberInitialBounds) continue

      const result = member.dispatch({
        type: 'scale',
        factor: action.factor,
        center: action.center,  // GROUP's fixed corner - elements move + resize
        initialBounds: memberInitialBounds,
      })

      if (result) {
        allChanges.push(...result.changes)
      }
    }
    return allChanges
  }

  private handleClone(
    action: TCloneAction,
  ): TChange[] {
    const allChanges: TChange[] = []
    const newGroup: TGroup = {
      id: action.id ?? crypto.randomUUID(),
      name: `Clone of ${this.group.name}`,
      color: this.group.color,
      createdAt: Date.now(),
      locked: false,
      parentGroupId: action.parent?.id ?? null,
    }
    allChanges.push({ op: 'insert', dest: 'crdt', path: ['groups', newGroup.id], value: newGroup })
    for (const member of this.members) {
      const result = member.dispatch({ type: 'clone', parent: newGroup })
      if (result) {
        allChanges.push(...result.changes)
      }
    }
    return allChanges
  }

  private handleDelete(): TChange[] {
    const allChanges: TChange[] = [
      Change.delete(['groups', this.id])
    ]

    this.canvas.removeGroup(this.id)

    for (const member of this.members) {
      const result = member.dispatch({ type: 'delete' })
      if (result) allChanges.push(...result.changes)
    }

    return allChanges
  }
  // ─────────────────────────────────────────────────────────────
  // SNAPSHOT (for undo/redo)
  // ─────────────────────────────────────────────────────────────

  public captureSnapshot(): TSnapshot {
    const snapshot = createEmptySnapshot()
    snapshot.groups[this.id] = structuredClone(this.group)

    for (const member of this.members) {
      const memberSnapshot = member.captureSnapshot()
      Object.assign(snapshot.elements, memberSnapshot.elements)
    }

    return snapshot
  }

  public restoreSnapshot(snapshot: TSnapshot): TChanges {
    const allChanges: TChanges["changes"] = []

    for (const member of this.members) {
      const result = member.restoreSnapshot(snapshot)
      allChanges.push(...result.changes)
    }

    this._bounds = null

    return {
      action: { type: 'restore' },
      targetId: this.id,
      timestamp: Date.now(),
      changes: allChanges,
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SELECTION & TRANSFORM BOX (like AElement)
  // ─────────────────────────────────────────────────────────────

  /** Sync container position to group center */
  private syncContainerPosition(): void {
    // Container should be at the top-left of the group bounds
    // because TransformBox draws from (0,0) to (w,h)
    const bounds = this.computeBounds()
    this.container.position.set(bounds.x, bounds.y)
    this._bounds = null
  }

  /** Set transform box mode ('full' for single, 'frame' for multi) */
  public setTransformBoxMode(mode: TTransformBoxMode): void {
    this.transformBox?.setMode(mode)
  }

  /** Select this group - show TransformBox */
  public select(): void {
    this.isSelected = true
    this._bounds = null // Recompute bounds
    this.syncContainerPosition()
    this.transformBox?.redraw()
    this.transformBox?.show()
  }

  /** Deselect this group - hide TransformBox */
  public deselect(): void {
    this.isSelected = false
    this.transformBox?.hide()
  }

  // ─────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────

  public redraw(): void {
    this._bounds = null
    this.syncContainerPosition()
    this.transformBox?.redraw()
  }

  public destroy(): void {
    this.transformBox?.destroy()
    this.container.destroy()
    this._members = null
    this._bounds = null
  }
}
