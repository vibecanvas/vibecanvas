import type { TChanges } from "@/features/canvas-crdt/types/changes"
import { Change } from "@/features/canvas-crdt/types/changes"
import type { TApplyContext } from "./rect.apply-context"

/**
 * Apply deselect action to an element.
 * Sets selection state to false.
 *
 * Used by: rect, diamond, ellipse, image, line, text
 */
export function applyDeselect(ctx: TApplyContext<any>): TChanges {
  ctx.setIsSelected(false)

  return {
    action: { type: 'deselect' },
    targetId: ctx.id,
    timestamp: Date.now(),
    changes: [
      Change.local(['selection', ctx.id], false),
    ],
  }
}
