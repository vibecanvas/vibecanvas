import type { TLineApplyContext } from "./line.apply-context"

/**
 * Enter edit mode (triggered by double-click).
 * - Hides transform box
 * - Shows midpoints for adding new vertices
 * - Exit by deselecting the element
 */
export function applyEnter(ctx: TLineApplyContext): null {
  ctx.setEditMode(true)
  return null
}
