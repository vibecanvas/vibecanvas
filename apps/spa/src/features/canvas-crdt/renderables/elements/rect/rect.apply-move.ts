import type { TMoveAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import { Change } from "@/features/canvas-crdt/types/changes"
import { clampX, clampY, type TApplyContext } from "./rect.apply-context"

/**
 * Apply move action to an element.
 * Updates position by delta and redraws.
 *
 * Used by: rect, diamond, ellipse, image, text
 * Line has unique implementation (x/y only, no w/h in changes).
 */
export function applyMove(ctx: TApplyContext<any>, action: TMoveAction): TChanges {
  ctx.element.x = clampX(ctx.element.x + action.delta.x)
  ctx.element.y = clampY(ctx.element.y + action.delta.y)
  ctx.redraw()

  return {
    action,
    targetId: ctx.id,
    timestamp: Date.now(),
    changes: [
      Change.crdt(['elements', ctx.id, 'x'], ctx.element.x),
      Change.crdt(['elements', ctx.id, 'y'], ctx.element.y),
    ],
  }
}
