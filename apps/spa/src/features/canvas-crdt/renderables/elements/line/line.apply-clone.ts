import type { TCloneAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import type { TApplyContext } from "../rect/rect.apply-context"
import type { TBackendElementOf } from "../../element.abstract"

/**
 * Apply clone action to a line element.
 * Creates a deep copy with new ID, including deep clone of segments array.
 *
 * Line elements have a unique data structure with segments array that needs
 * proper deep cloning to avoid reference issues.
 */
export function applyClone(ctx: TApplyContext<any>, action: TCloneAction): TChanges {
  const line: TBackendElementOf<'line'> = {
    ...structuredClone(ctx.element),
    id: action.id ?? crypto.randomUUID(),
    parentGroupId: action.parent?.id ?? null,
  } as TBackendElementOf<'line'>

  return {
    action,
    targetId: ctx.id,
    timestamp: Date.now(),
    changes: [
      { op: 'insert', dest: 'crdt', path: ['elements', line.id], value: line }
    ]
  }
}
