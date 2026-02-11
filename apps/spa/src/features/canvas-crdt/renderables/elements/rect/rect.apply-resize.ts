import type { TResizeAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import { Change } from "@/features/canvas-crdt/types/changes"
import type { TApplyContextWH } from "./rect.apply-context"

/**
 * Apply resize action to an element with w/h dimensions.
 * Delegates to setResize for the actual resize calculation.
 *
 * Used by: rect, diamond, image
 * Ellipse has unique implementation (rx/ry changes).
 * Line and text do not support resize.
 */
export function applyResize(ctx: TApplyContextWH, action: TResizeAction): TChanges {
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
      Change.crdt(['elements', ctx.id, 'data', 'w'], ctx.element.data.w),
      Change.crdt(['elements', ctx.id, 'data', 'h'], ctx.element.data.h),
    ],
  }
}
