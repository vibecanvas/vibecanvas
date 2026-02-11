import type { TRotateAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import { Change } from "@/features/canvas-crdt/types/changes"
import type { TApplyContext } from "./rect.apply-context"

/**
 * Apply rotate action to an element.
 * Updates angle on element and container.
 *
 * Used by: rect, diamond, ellipse, image, line, text
 */
export function applyRotate(ctx: TApplyContext<any>, action: TRotateAction): TChanges {
  ctx.element.angle = action.angle
  ctx.container.rotation = action.angle
  ctx.transformBox?.redraw()

  return {
    action,
    targetId: ctx.id,
    timestamp: Date.now(),
    changes: [
      Change.crdt(['elements', ctx.id, 'angle'], ctx.element.angle),
    ],
  }
}
