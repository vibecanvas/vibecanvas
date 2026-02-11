import type { DocHandle } from "@automerge/automerge-repo"
import type { TCanvasDoc } from "@vibecanvas/shell/automerge/index"
import type { TChanges } from "../types"

/**
 * Apply changes to CRDT document.
 * Filters out local-only changes and applies CRDT changes to the document.
 */
export function applyChangesToCRDT(
  handle: DocHandle<TCanvasDoc>,
  allChanges: TChanges[]
): void {
  handle.change(doc => {
    for (const changes of allChanges) {
      for (const change of changes.changes) {
        // Skip local-only changes
        if (change.dest !== 'crdt') continue

        switch (change.op) {
          case 'insert':
          case 'update':
            setPath(doc, change.path, change.value)
            break
          case 'delete':
            deletePath(doc, change.path)
            break
        }
      }
    }
  })
}

/**
 * Set value at path in object
 */
function setPath(obj: any, path: (string | number)[], value: unknown): void {
  if (path.length === 0) return

  let current = obj
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    if (current[key] === undefined) {
      // Create intermediate object if needed
      current[key] = typeof path[i + 1] === 'number' ? [] : {}
    }
    current = current[key]
  }
  current[path[path.length - 1]] = value
}

/**
 * Delete value at path in object
 */
function deletePath(obj: any, path: (string | number)[]): void {
  if (path.length === 0) return

  let current = obj
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    if (current[key] === undefined) return
    current = current[key]
  }
  delete current[path[path.length - 1]]
}
