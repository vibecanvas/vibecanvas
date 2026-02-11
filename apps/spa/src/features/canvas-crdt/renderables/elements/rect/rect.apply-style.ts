import type { TSetStyleAction } from "@/features/canvas-crdt/types/actions"
import type { TChanges } from "@/features/canvas-crdt/types/changes"
import { Change } from "@/features/canvas-crdt/types/changes"
import type { TApplyContext } from "./rect.apply-context"

/**
 * Apply setStyle action to an element.
 * Updates style properties and redraws.
 *
 * Used by: rect, diamond, ellipse, image, line, text
 */
export function applySetStyle(ctx: TApplyContext<any>, action: TSetStyleAction): TChanges {
  const changes: ReturnType<typeof Change.crdt>[] = []

  for (const [key, value] of Object.entries(action.style)) {
    if (value !== undefined) {
      ;(ctx.element.style as any)[key] = value
      changes.push(
        Change.crdt(['elements', ctx.id, 'style', key], value),
      )
    }
  }

  ctx.redraw()

  return {
    action,
    targetId: ctx.id,
    timestamp: Date.now(),
    changes,
  }
}
