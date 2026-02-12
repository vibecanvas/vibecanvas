import type { TResizeAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import { Change } from "@/features/canvas-crdt/types/changes"
import type { TTextData } from "@vibecanvas/shell"
import type { TApplyContext } from "../rect/rect.apply-context"

/**
 * Apply resize action to text element.
 * Text resize updates fontSize and resulting bounds.
 */
export function applyResize(ctx: TApplyContext<TTextData>, action: TResizeAction): TChanges {
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
      Change.crdt(['elements', ctx.id, 'data', 'fontSize'], ctx.element.data.fontSize),
    ],
  }
}
