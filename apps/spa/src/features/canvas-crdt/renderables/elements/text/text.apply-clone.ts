import type { TCloneAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import { Change } from "@/features/canvas-crdt/types/changes"
import type { TApplyContext } from "../rect/rect.apply-context"
import type { TBackendElementOf } from "../../element.abstract"

/**
 * Apply clone action to a text element.
 * Creates a new text element with the same data.
 *
 * Text has its own clone implementation because:
 * - Returns 'text' element type
 */
export function applyClone(ctx: TApplyContext<any>, action: TCloneAction): TChanges {
  const text: TBackendElementOf<'text'> = {
    ...structuredClone(ctx.element),
    id: action.id ?? crypto.randomUUID(),
    parentGroupId: action.parent?.id ?? null,
  } as TBackendElementOf<'text'>

  return {
    action,
    targetId: ctx.id,
    timestamp: Date.now(),
    changes: [
      Change.insert(['elements', text.id], text),
    ],
  }
}
