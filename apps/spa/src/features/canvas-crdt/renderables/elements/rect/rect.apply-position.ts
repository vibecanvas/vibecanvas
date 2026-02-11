import type { TSetPositionAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import { Change } from "@/features/canvas-crdt/types/changes"
import { clampX, clampY, type TApplyContext } from "./rect.apply-context"

/**
 * Apply setPosition action to an element.
 * Sets absolute position and updates container.
 *
 * Used by: rect, diamond, ellipse, image
 * Line has unique implementation (no container position offset).
 * Text does not support setPosition.
 */
export function applySetPosition(ctx: TApplyContext<any>, action: TSetPositionAction): TChanges {
  ctx.element.x = clampX(action.position.x)
  ctx.element.y = clampY(action.position.y)

  // Update container position (center = element pos + half dimensions)
  const local = ctx.localBounds
  ctx.container.x = clampX(ctx.element.x + local.width / 2)
  ctx.container.y = clampY(ctx.element.y + local.height / 2)

  ctx.transformBox?.redraw()

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
