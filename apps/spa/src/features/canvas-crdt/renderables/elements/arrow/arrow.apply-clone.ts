import type { TCloneAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import type { TApplyContext } from "../rect/rect.apply-context"

/**
 * Apply clone action to an arrow element.
 * Creates a deep copy with new ID, including deep clone of segments array.
 *
 * Arrow elements inherit line's data structure with segments array,
 * plus startCap and endCap properties that need proper deep cloning.
 */
export function applyClone(ctx: TApplyContext<any>, action: TCloneAction): TChanges {
  const arrow = {
    ...structuredClone(ctx.element),
    id: action.id ?? crypto.randomUUID(),
    parentGroupId: action.parent?.id ?? null,
  }

  return {
    action,
    targetId: ctx.id,
    timestamp: Date.now(),
    changes: [
      { op: 'insert', dest: 'crdt', path: ['elements', arrow.id], value: arrow }
    ]
  }
}
