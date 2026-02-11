import { showToast } from "@/components/ui/Toast"

/**
 * Represents a single undoable action.
 *
 * @example
 * const entry: UndoEntry = {
 *   id: 'abc-123',
 *   label: 'Move element',
 *   undo: () => { canvas.handle.change(doc => { doc.elements[id].x = oldX }) },
 *   redo: () => { canvas.handle.change(doc => { doc.elements[id].x = newX }) },
 * }
 */
export type UndoEntry = {
  id: string
  undo: () => void
  redo: () => void
  label?: string
}

/**
 * Manages undo/redo stacks for canvas operations.
 *
 * ## Usage
 *
 * The UndoManager uses a closure-based approach. When recording an action,
 * you provide `undo` and `redo` functions that capture all necessary state
 * to reverse or re-apply the action.
 *
 * ### Basic Pattern (in input commands)
 *
 * ```ts
 * // 1. Capture initial state BEFORE the operation (in handleDown)
 * const initialState = { x: element.x, y: element.y }
 *
 * // 2. Perform the operation (in handleMove)
 * element.x = newX
 * element.y = newY
 *
 * // 3. Capture final state and record undo entry (in handleUp)
 * const finalState = { x: element.x, y: element.y }
 * const elementId = element.id  // Capture ID, not reference!
 *
 * // Persist to CRDT first
 * ctx.canvas.handle.change(doc => {
 *   doc.elements[elementId].x = finalState.x
 *   doc.elements[elementId].y = finalState.y
 * })
 *
 * // Then record undo entry
 * ctx.canvas.undoManager.record({
 *   label: 'Move',
 *   undo: () => {
 *     ctx.canvas.handle.change(doc => {
 *       doc.elements[elementId].x = initialState.x
 *       doc.elements[elementId].y = initialState.y
 *     })
 *   },
 *   redo: () => {
 *     ctx.canvas.handle.change(doc => {
 *       doc.elements[elementId].x = finalState.x
 *       doc.elements[elementId].y = finalState.y
 *     })
 *   }
 * })
 * ```
 *
 * ## Gotchas
 *
 * ### 1. Capture primitive values, not object references
 * ```ts
 * // BAD - captures reference that may change
 * const initial = element  // Object reference
 * undo: () => { doc.elements[id] = initial }  // initial may have mutated!
 *
 * // GOOD - captures primitive values
 * const initialX = element.x
 * const initialY = element.y
 * undo: () => { doc.elements[id].x = initialX; doc.elements[id].y = initialY }
 * ```
 *
 * ### 2. Capture element IDs, not element references
 * ```ts
 * // BAD - element reference may become stale after CRDT sync
 * undo: () => { element.x = oldX }
 *
 * // GOOD - look up by ID in the CRDT doc
 * const elementId = element.id
 * undo: () => { ctx.canvas.handle.change(doc => { doc.elements[elementId].x = oldX }) }
 * ```
 *
 * ### 3. Always use handle.change() in undo/redo closures
 * The undo/redo functions should mutate the CRDT document, which will
 * automatically sync to renderables via the patch system.
 * ```ts
 * // BAD - only updates renderable, not CRDT
 * undo: () => { renderable.x = oldX }
 *
 * // GOOD - updates CRDT, which syncs to renderable
 * undo: () => { ctx.canvas.handle.change(doc => { doc.elements[id].x = oldX }) }
 * ```
 *
 * ### 4. Copy Maps/Arrays when capturing state
 * ```ts
 * // BAD - Map reference will reflect current state when undo runs
 * const initialStates = stateMap
 *
 * // GOOD - create a copy
 * const initialStates = new Map(stateMap)
 * ```
 *
 * ### 5. Record undo AFTER persisting to CRDT
 * ```ts
 * // Persist first
 * ctx.canvas.handle.change(doc => { ... })
 *
 * // Then record undo (so redo replays the same final state)
 * ctx.canvas.undoManager.record({ ... })
 * ```
 *
 * ### 6. Handle element deletion carefully
 * If an element might be deleted, your undo/redo should check if it exists:
 * ```ts
 * undo: () => {
 *   ctx.canvas.handle.change(doc => {
 *     const el = doc.elements[elementId]
 *     if (el) {  // Element might have been deleted
 *       el.x = initialX
 *     }
 *   })
 * }
 * ```
 *
 * ## Keyboard Shortcuts
 *
 * Undo/redo is triggered by `cmd.undo-redo.ts`:
 * - `Cmd+Z` / `Ctrl+Z` → undo()
 * - `Cmd+Shift+Z` / `Ctrl+Shift+Z` → redo()
 * - `Cmd+Y` / `Ctrl+Y` → redo()
 */
export class UndoManager {
  private undoStack: UndoEntry[] = []
  private redoStack: UndoEntry[] = []
  private maxStackSize = 100

  /**
   * Records an undoable action.
   *
   * Call this AFTER persisting the change to the CRDT.
   * The redo stack is cleared when a new action is recorded.
   *
   * @param entry - The undo/redo closures and optional label
   *
   * @example
   * ctx.canvas.undoManager.record({
   *   label: 'Resize',
   *   undo: () => { ctx.canvas.handle.change(doc => { ... restore initial state ... }) },
   *   redo: () => { ctx.canvas.handle.change(doc => { ... apply final state ... }) }
   * })
   */
  record(entry: Omit<UndoEntry, 'id'>): void {
    this.undoStack.push({
      id: crypto.randomUUID(),
      ...entry,
    })
    // Clear redo stack on new action
    this.redoStack = []

    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift()
    }
  }

  /**
   * Undoes the most recent action.
   *
   * Pops from undo stack, executes the undo closure, and pushes to redo stack.
   * Shows a toast notification with the action label.
   *
   * @returns `true` if an action was undone, `false` if stack was empty
   */
  undo(): boolean {
    const entry = this.undoStack.pop()
    showToast('Undo', entry?.label)
    if (!entry) return false

    entry.undo()
    this.redoStack.push(entry)
    return true
  }

  /**
   * Redoes the most recently undone action.
   *
   * Pops from redo stack, executes the redo closure, and pushes to undo stack.
   * Shows a toast notification with the action label.
   *
   * @returns `true` if an action was redone, `false` if stack was empty
   */
  redo(): boolean {
    const entry = this.redoStack.pop()
    showToast('Redo', entry?.label)
    if (!entry) return false

    entry.redo()
    this.undoStack.push(entry)
    return true
  }

  /** Returns `true` if there are actions that can be undone. */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /** Returns `true` if there are actions that can be redone. */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * Clears both undo and redo stacks.
   *
   * Call this when switching canvases or when the document state
   * is reset in a way that invalidates previous undo history.
   */
  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}