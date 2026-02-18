import type { TElement, TElementData, TElementStyle } from "@vibecanvas/shell/automerge/types/canvas-doc"

export function createElement(
  id: string,
  x: number,
  y: number,
  data: TElementData,
  style: TElementStyle,
  zIndex: string = 'a'
): TElement {
  const now = Date.now()
  return {
    id,
    x,
    y,
    angle: 0,
    zIndex,
    parentGroupId: null,
    bindings: [],
    locked: false,
    createdAt: now,
    updatedAt: now,
    data,
    style,
  }
}