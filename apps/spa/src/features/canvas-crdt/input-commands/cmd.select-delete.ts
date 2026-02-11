import { setStore, store } from "@/store"
import type { TElement } from "@vibecanvas/shell/automerge/index"
import type { Canvas } from "../canvas/canvas"
import { applyChangesToCRDT } from "../changes/apply"
import type { TChanges, TSnapshot } from "../types"
import { Change, createEmptySnapshot } from "../types"
import type { InputCommand } from "./types"

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Capture a snapshot of elements to be deleted.
 * Uses structuredClone for deep copy to avoid stale references.
 */
function captureDeleteSnapshot(
  canvas: Canvas,
  elementIds: string[]
): TSnapshot {
  const snapshot = createEmptySnapshot()
  const doc = canvas.handle.doc()

  for (const id of elementIds) {
    const element = doc?.elements[id]
    if (element) {
      snapshot.elements[id] = structuredClone(element) as TElement
    }
  }

  return snapshot
}

/**
 * Create insert changes to restore elements from snapshot (for undo).
 */
function createInsertChanges(snapshot: TSnapshot): TChanges[] {
  const allChanges: TChanges[] = []

  for (const [id, element] of Object.entries(snapshot.elements)) {
    allChanges.push({
      action: { type: 'restore' },
      targetId: id,
      timestamp: Date.now(),
      changes: [
        Change.insert(['elements', id], element),
      ],
    })
  }

  return allChanges
}

/**
 * Restore elements from snapshot (for undo).
 * Inserts elements back into CRDT - the patch system will recreate renderables.
 */
function restoreFromSnapshot(canvas: Canvas, snapshot: TSnapshot): void {
  const insertChanges = createInsertChanges(snapshot)
  if (insertChanges.length > 0) {
    applyChangesToCRDT(canvas.handle, insertChanges)
  }
}

// ─────────────────────────────────────────────────────────────
// Command Export
// ─────────────────────────────────────────────────────────────

/**
 * Handle delete key to remove selected elements using action/snapshot pattern:
 * - Backspace/Delete: Remove all selected elements
 * - Captures snapshot before deletion for undo
 * - Uses applyChangesToCRDT for CRDT persistence
 * - Patch system handles visual cleanup/recreation
 */
export const cmdSelectDelete: InputCommand = (ctx) => {
  if (ctx.eventType !== 'keydown') return false
  const e = ctx.event as KeyboardEvent
  if (e.key !== 'Backspace' && e.key !== 'Delete') return false
  // Ignore if typing in input/textarea
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return false
  }

  const selectedIds = [...store.canvasSlice.selectedIds]
  if (selectedIds.length === 0) return false

  const changes: TChanges[] = []
  // Capture snapshot before deletion (for undo)
  const snapshot = captureDeleteSnapshot(ctx.canvas, selectedIds)
  // Dispatch delete action to all selected members
  const members = ctx.canvas.mapMembers(selectedIds)
  for (const member of members) {
    const result = member.dispatch({ type: 'delete' })
    if (result) changes.push(result)
  }

  // Apply changes to CRDT
  applyChangesToCRDT(ctx.canvas.handle, changes)
  // Clear selection
  setStore('canvasSlice', 'selectedIds', [])

  // Record undo/redo
  const capturedSnapshot = snapshot
  const capturedCanvas = ctx.canvas

  ctx.canvas.undoManager.record({
    label: 'Delete',
    undo: () => restoreFromSnapshot(capturedCanvas, capturedSnapshot),
    redo: () => {
      applyChangesToCRDT(capturedCanvas.handle, changes)
    },
  })

  return true
}
