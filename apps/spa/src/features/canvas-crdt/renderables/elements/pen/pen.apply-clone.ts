import type { TCloneAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import type { TApplyContext } from "../rect/rect.apply-context"
import type { TBackendElementOf } from "../../element.abstract"
import type { TPenData } from "@vibecanvas/shell/automerge/index"

/**
 * Apply clone action to a pen element.
 * Creates a deep copy with new ID, including deep clone of points/pressures arrays.
 */
export function applyClone(ctx: TApplyContext<TPenData>, action: TCloneAction): TChanges {
  const pen: TBackendElementOf<'pen'> = {
    ...structuredClone(ctx.element),
    id: action.id ?? crypto.randomUUID(),
    parentGroupId: action.parent?.id ?? null,
  } as TBackendElementOf<'pen'>

  return {
    action,
    targetId: ctx.id,
    timestamp: Date.now(),
    changes: [
      { op: 'insert', dest: 'crdt', path: ['elements', pen.id], value: pen }
    ]
  }
}
