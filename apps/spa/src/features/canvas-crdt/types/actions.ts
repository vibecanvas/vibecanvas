import type { TElementStyle, TGroup } from "@vibecanvas/shell/automerge/index"
import type { Point } from "pixi.js"
import type { TResizeContext } from "../renderables/transformable.interface"

// ─────────────────────────────────────────────────────────────
// 1. SINGLE SOURCE OF TRUTH - Define all actions here
// ─────────────────────────────────────────────────────────────

type TActionRegistry = {
  // Transform actions
  translate: { delta: Point }
  // maybe deprecated, will not work wir nested groups
  setPosition: { position: Point }
  move: { delta: Point }
  rotate: { angle: number; center?: Point }
  scale: { factor: number; center: Point; initialBounds: { x: number; y: number; w: number; h: number } }
  // TODO: update resize payload, no import should be needed
  resize: { ctx: TResizeContext }

  // Selection actions
  select: void
  deselect: void
  enter: void

  // Style actions
  setStyle: { style: Partial<TElementStyle> }
  setStyleProp: { path: string[]; value: unknown }

  // Group actions
  group: { groupId: string; memberIds: string[] }
  ungroup: { groupId: string }
  addToGroup: { groupId: string }
  removeFromGroup: void

  // other actions
  clone: { parent?: TGroup, id?: string }
  delete: void

  // Restore (undo/redo), used to communicated changes to CRDT for broadcasting to clients
  restore: void
}

// ─────────────────────────────────────────────────────────────
// 2. DERIVED TYPES - Everything below is auto-generated
// ─────────────────────────────────────────────────────────────

/** All action type strings */
export type TActionType = keyof TActionRegistry

/** Convert registry entry to action object */
type ToAction<K extends TActionType> =
  TActionRegistry[K] extends void
    ? { type: K }
    : { type: K } & TActionRegistry[K]

/** Union of all actions - auto-generated from registry */
export type TAction = { [K in TActionType]: ToAction<K> }[TActionType]

/** Get specific action type by name */
export type TActionOf<K extends TActionType> = ToAction<K>

// ─────────────────────────────────────────────────────────────
// 3. NAMED EXPORTS (for readability and existing imports)
// ─────────────────────────────────────────────────────────────

export type TTranslateAction = TActionOf<'translate'>
export type TSetPositionAction = TActionOf<'setPosition'>
export type TMoveAction = TActionOf<'move'>
export type TRotateAction = TActionOf<'rotate'>
export type TScaleAction = TActionOf<'scale'>
export type TResizeAction = TActionOf<'resize'>
export type TCloneAction = TActionOf<'clone'>

export type TSelectAction = TActionOf<'select'>
export type TDeselectAction = TActionOf<'deselect'>

export type TSetStyleAction = TActionOf<'setStyle'>
export type TSetStylePropAction = TActionOf<'setStyleProp'>

export type TGroupAction =
  | TActionOf<'group'>
  | TActionOf<'ungroup'>
  | TActionOf<'addToGroup'>
  | TActionOf<'removeFromGroup'>

export type TRestoreAction = TActionOf<'restore'>

// Group unions for convenience
export type TTransformAction =
  | TTranslateAction
  | TSetPositionAction
  | TMoveAction
  | TRotateAction
  | TScaleAction
  | TResizeAction

export type TSelectionAction =
  | TSelectAction
  | TDeselectAction

export type TStyleAction =
  | TSetStyleAction
  | TSetStylePropAction

// ─────────────────────────────────────────────────────────────
// 4. TYPE-SAFE ACTION CREATOR
// ─────────────────────────────────────────────────────────────

export function createAction<K extends TActionType>(
  type: K,
  ...args: TActionRegistry[K] extends void ? [] : [TActionRegistry[K]]
): TActionOf<K> {
  return (args.length === 0 ? { type } : { type, ...args[0] }) as TActionOf<K>
}
