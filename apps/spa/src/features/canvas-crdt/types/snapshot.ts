import type { TElement, TGroup } from "@vibecanvas/shell"

// ─────────────────────────────────────────────────────────────
// SNAPSHOT - Combined state for undo/redo
// ─────────────────────────────────────────────────────────────

/**
 * Snapshot of transformable state (for undo/redo).
 * Works for both single elements and groups.
 *
 * Single element: elements has 1 entry, groups empty
 * Group: elements has N entries, groups has group metadata
 */
export type TSnapshot = {
  /** Element states keyed by ID */
  elements: Record<string, TElement>
  /** Group states keyed by ID */
  groups: Record<string, TGroup>
}

// ─────────────────────────────────────────────────────────────
// SNAPSHOT HELPERS
// ─────────────────────────────────────────────────────────────

/** Create an empty snapshot */
export function createEmptySnapshot(): TSnapshot {
  return { elements: {}, groups: {} }
}

/** Check if snapshot is empty */
export function isEmptySnapshot(snapshot: TSnapshot): boolean {
  return Object.keys(snapshot.elements).length === 0
      && Object.keys(snapshot.groups).length === 0
}
