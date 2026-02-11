import type { TMoveAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import { Change } from "@/features/canvas-crdt/types/changes"
import type { TLineApplyContext } from "./line.apply-context"

/**
 * Apply move action to a line element.
 * Moves the element by a relative delta.
 */
export function applyMove(ctx: TLineApplyContext, action: TMoveAction): TChanges {
  ctx.element.x = ctx.element.x + action.delta.x
  ctx.element.y = ctx.element.y + action.delta.y
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
