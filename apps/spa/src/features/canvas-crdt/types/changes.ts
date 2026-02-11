import type { TAction } from "./actions"

// ─────────────────────────────────────────────────────────────
// CHANGE DEFINITIONS
// ─────────────────────────────────────────────────────────────

/** Change operation type */
export type TChangeOp = 'insert' | 'update' | 'delete'

/** Destination for the change */
export type TChangeDest = 'crdt' | 'local'

/** Change with value (insert/update) */
type TChangeWithValue = {
  op: 'insert' | 'update'
  dest: TChangeDest
  path: (string | number)[]
  value: unknown
}

/** Change without value (delete) */
type TChangeDelete = {
  op: 'delete'
  dest: TChangeDest
  path: (string | number)[]
}

/** A single change to be applied */
export type TChange = TChangeWithValue | TChangeDelete

/** Collection of changes from an action */
export type TChanges = {
  /** The action that produced these changes */
  action: TAction
  /** Target element/group ID */
  targetId: string
  /** List of individual changes */
  changes: TChange[]
  /** Timestamp */
  timestamp: number
}

// ─────────────────────────────────────────────────────────────
// CHANGE BUILDERS (helpers)
// ─────────────────────────────────────────────────────────────

export const Change = {
  /** Update a CRDT field */
  crdt: (path: (string | number)[], value: unknown): TChange => ({
    op: 'update',
    dest: 'crdt',
    path,
    value,
  }),

  /** Update a local field */
  local: (path: (string | number)[], value: unknown): TChange => ({
    op: 'update',
    dest: 'local',
    path,
    value,
  }),

  /** Insert into CRDT */
  insert: (path: (string | number)[], value: unknown): TChange => ({
    op: 'insert',
    dest: 'crdt',
    path,
    value,
  }),

  /** Delete from CRDT */
  delete: (path: (string | number)[]): TChange => ({
    op: 'delete',
    dest: 'crdt',
    path,
  }),
} as const
