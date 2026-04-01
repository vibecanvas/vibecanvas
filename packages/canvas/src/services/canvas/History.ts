
export type THistoryEntry = {
  undo: () => void
  redo: () => void
  label?: string
}
export class History {
  #undoStack: THistoryEntry[] = [];
  #redoStack: THistoryEntry[] = [];
  #maxStackSize = 100

  /**
   * Records an undoable action.
   *
   * The redo stack is cleared when a new action is recorded.
   *
   * @param entry - The undo/redo closures and optional label
   *
   */
  record(entry: THistoryEntry): void {
    this.#undoStack.push(entry)
    // Clear redo stack on new action
    this.#redoStack = []

    // Limit stack size
    if (this.#undoStack.length > this.#maxStackSize) {
      this.#undoStack.shift()
    }
  }

  undo(): boolean {
    const entry = this.#undoStack.pop()
    if (!entry) return false

    entry.undo()
    this.#redoStack.push(entry)
    return true
  }

  redo(): boolean {
    const entry = this.#redoStack.pop()
    if (!entry) return false

    entry.redo()
    this.#undoStack.push(entry)
    return true
  }

  canUndo(): boolean {
    return this.#undoStack.length > 0
  }

  canRedo(): boolean {
    return this.#redoStack.length > 0
  }

  clear(): void {
    this.#undoStack = []
    this.#redoStack = []
  }

}
