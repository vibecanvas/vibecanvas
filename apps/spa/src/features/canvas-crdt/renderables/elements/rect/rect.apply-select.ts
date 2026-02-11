import type { TChanges } from "@/features/canvas-crdt/types/changes"
import { Change } from "@/features/canvas-crdt/types/changes"
import type { TApplyContext } from "./rect.apply-context"

/**
 * Apply select action to an element.
 * Sets selection state to true.
 *
 * Used by: rect, diamond, ellipse, image, line, text
 */
export function applySelect(ctx: TApplyContext<any>): TChanges {
  ctx.setIsSelected(true)

  return {
    action: { type: 'select' },
    targetId: ctx.id,
    timestamp: Date.now(),
    changes: [
      Change.local(['selection', ctx.id], true),
    ],
  }
}
