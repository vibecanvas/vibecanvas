import type { TCloneAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import type { TApplyContextWH } from "../rect/rect.apply-context"
import type { TBackendElementOf } from "../../element.abstract"

/**
 * Apply clone action to a diamond element.
 * Creates a deep copy with new ID.
 *
 * Each element type has its own clone implementation because the
 * cloned element needs to be properly typed.
 */
export function applyClone(ctx: TApplyContextWH, action: TCloneAction): TChanges {
  const diamond: TBackendElementOf<'diamond'> = {
    ...structuredClone(ctx.element),
    id: action.id ?? crypto.randomUUID(),
    parentGroupId: action.parent?.id ?? null,
  } as TBackendElementOf<'diamond'>

  return {
    action,
    targetId: ctx.id,
    timestamp: Date.now(),
    changes: [
      { op: 'insert', dest: 'crdt', path: ['elements', diamond.id], value: diamond }
    ]
  }
}
