import type { TResizeAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import { Change } from "@/features/canvas-crdt/types/changes"
import type { TApplyContextRadius } from "../rect/rect.apply-context"

/**
 * Apply resize action to an ellipse element.
 * Delegates to setResize for the actual resize calculation.
 *
 * Unique to ellipse - changes path uses rx/ry instead of w/h.
 */
export function applyResize(ctx: TApplyContextRadius, action: TResizeAction): TChanges {
  if (ctx.setResize) {
    ctx.setResize(action.ctx)
  }

  return {
    action,
    targetId: ctx.id,
    timestamp: Date.now(),
    changes: [
      Change.crdt(['elements', ctx.id, 'x'], ctx.element.x),
      Change.crdt(['elements', ctx.id, 'y'], ctx.element.y),
      Change.crdt(['elements', ctx.id, 'data', 'rx'], ctx.element.data.rx),
      Change.crdt(['elements', ctx.id, 'data', 'ry'], ctx.element.data.ry),
    ],
  }
}
