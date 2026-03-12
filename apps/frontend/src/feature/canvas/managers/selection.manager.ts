type TSelectionChangeListener = (selectedIds: string[]) => void;

export class SelectionManager {
  #selectedIds = new Set<string>();
  #listeners = new Set<TSelectionChangeListener>();

  clear() {
    if (this.#selectedIds.size === 0) return;
    this.#selectedIds.clear();
    this.#notify();
  }

  selectOnly(nodeId: string) {
    if (this.#selectedIds.size === 1 && this.#selectedIds.has(nodeId)) return;

    this.#selectedIds = new Set([nodeId]);
    this.#notify();
  }

  setSelectedIds(nodeIds: string[]) {
    const nextIds = new Set(nodeIds);

    if (nextIds.size === this.#selectedIds.size && [...nextIds].every((nodeId) => this.#selectedIds.has(nodeId))) {
      return;
    }

    this.#selectedIds = nextIds;
    this.#notify();
  }

  isSelected(nodeId: string) {
    return this.#selectedIds.has(nodeId);
  }

  getSelectedIds() {
    return [...this.#selectedIds];
  }

  pruneSelectedIds(validNodeIds: Iterable<string>) {
    const validIds = new Set(validNodeIds);
    const nextIds = this.getSelectedIds().filter((nodeId) => validIds.has(nodeId));

    if (nextIds.length === this.#selectedIds.size) return;

    this.#selectedIds = new Set(nextIds);
    this.#notify();
  }

  onChange(listener: TSelectionChangeListener) {
    this.#listeners.add(listener);

    return () => {
      this.#listeners.delete(listener);
    };
  }

  #notify() {
    const selectedIds = this.getSelectedIds();
    for (const listener of this.#listeners) {
      listener(selectedIds);
    }
  }
}

export type { TSelectionChangeListener };
