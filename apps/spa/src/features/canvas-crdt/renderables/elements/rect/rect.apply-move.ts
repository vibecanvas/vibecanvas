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
  const prevX = ctx.element.x
  const prevY = ctx.element.y
  const nextX = clampX(prevX + action.delta.x)
  const nextY = clampY(prevY + action.delta.y)
  const appliedDeltaX = nextX - prevX
  const appliedDeltaY = nextY - prevY

  ctx.element.x = nextX
  ctx.element.y = nextY

  // Move container only; geometry does not change during translation.
  // Use applied deltas (post-clamp) to keep container and element in sync at bounds.
  ctx.container.x += appliedDeltaX
  ctx.container.y += appliedDeltaY

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
