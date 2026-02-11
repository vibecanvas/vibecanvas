import type { TCloneAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import type { TApplyContextWH } from "../rect/rect.apply-context"
import type { TBackendElementOf } from "../../element.abstract"

/**
 * Apply clone action to an image element.
 * Creates a deep copy with new ID.
 *
 * Each element type has its own clone implementation because the
 * cloned element needs to be properly typed.
 */
export function applyClone(ctx: TApplyContextWH, action: TCloneAction): TChanges {
  const image: TBackendElementOf<'image'> = {
    ...structuredClone(ctx.element),
    id: action.id ?? crypto.randomUUID(),
    parentGroupId: action.parent?.id ?? null,
  } as TBackendElementOf<'image'>

  return {
    action,
    targetId: ctx.id,
    timestamp: Date.now(),
    changes: [
      { op: 'insert', dest: 'crdt', path: ['elements', image.id], value: image }
    ]
  }
}
