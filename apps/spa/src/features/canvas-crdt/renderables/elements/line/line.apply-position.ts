import type { TSetPositionAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import { Change } from "@/features/canvas-crdt/types/changes"
import type { TLineApplyContext } from "./line.apply-context"

/**
 * Apply setPosition action to a line element.
 * Moves the element to an absolute position.
 */
export function applySetPosition(ctx: TLineApplyContext, action: TSetPositionAction): TChanges {
  ctx.element.x = action.position.x
  ctx.element.y = action.position.y
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
