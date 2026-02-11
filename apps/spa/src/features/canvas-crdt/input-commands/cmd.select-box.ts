import { setStore, store } from "@/store"
import { throttle } from "@solid-primitives/scheduled"
import { Point, Rectangle } from "pixi.js"
import type { Canvas } from "../canvas/canvas"
import type { InputCommand, PointerInputContext } from "./types"
import { isElementTarget } from "./types"

// Drag state (closure)
let isDragging = false
let dragStartWorld: Point | null = null
let selectionAtDragStart: string[] = [] // For shift+drag additive selection

const DRAG_THRESHOLD = 5 // pixels before drag starts

// Throttled store update (100ms)
const updateSelectedIds = throttle((ids: string[]) => {
  setStore('canvasSlice', 'selectedIds', ids)
}, 10)

function getShapesInSelectionBox(canvas: Canvas, start: Point, end: Point): string[] {
  const selectionRect = new Rectangle(
    Math.min(start.x, end.x),
    Math.min(start.y, end.y),
    Math.abs(end.x - start.x),
    Math.abs(end.y - start.y)
  )

  const selectedIds: string[] = []
  for (const [id, element] of canvas.elements) {
    if (selectionRect.containsRect(new Rectangle(element.worldBounds.x, element.worldBounds.y, element.worldBounds.width, element.worldBounds.height))) {
      selectedIds.push(id)
    }
  }
  return selectedIds
}

/**
 * Consolidate element IDs to group IDs.
 * If ANY element belongs to a group, use the group ID instead of element ID.
 */
function consolidateToGroups(canvas: Canvas, elementIds: string[]): string[] {
  if (elementIds.length === 0) return []

  const groupIds = new Set<string>()
  const ungroupedIds: string[] = []

  for (const id of elementIds) {
    const element = canvas.elements.get(id)
    if (element?.element.parentGroupId) {
      // Element belongs to a group → add group ID (not element ID)
      const outermostGroup = canvas.groupManager.getOutermostGroupForSelectable(id)
      if (outermostGroup) {
        groupIds.add(outermostGroup.id)
      }
    } else {
      // Ungrouped element → add element ID
      ungroupedIds.push(id)
    }
  }

  // Return unique group IDs + ungrouped element IDs
  return [...groupIds, ...ungroupedIds]
}

/**
 * Handle selection box (pointerdown/move/up)
 */
export const cmdSelectBox: InputCommand = (ctx) => {
  if (store.toolbarSlice.activeTool !== 'select') return false

  switch (ctx.eventType) {
    case 'pointerdown':
      return handleDown(ctx)
    case 'pointermove':
      return handleMove(ctx)
    case 'pointerup':
      return handleUp(ctx)
    default:
      return false
  }
}

function handleDown(ctx: PointerInputContext): boolean {
  if (!ctx.worldPos) return false

  // Only start on empty space (canvas target, not a drawing)
  if (isElementTarget(ctx.commandTarget)) return false

  dragStartWorld = ctx.worldPos
  isDragging = false

  // Capture selection at drag start for shift+drag additive behavior
  selectionAtDragStart = ctx.modifiers.shift
    ? [...store.canvasSlice.selectedIds]
    : []

  return true
}

function handleMove(ctx: PointerInputContext): boolean {
  if (!dragStartWorld) return false
  if (!ctx.worldPos) return false

  // Check if we've crossed the drag threshold
  if (!isDragging) {
    const dx = ctx.worldPos.x - dragStartWorld.x
    const dy = ctx.worldPos.y - dragStartWorld.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance >= DRAG_THRESHOLD) {
      isDragging = true
    }
  }

  if (isDragging) {
    ctx.canvas.selectionArea.update({
      x: Math.min(dragStartWorld.x, ctx.worldPos.x),
      y: Math.min(dragStartWorld.y, ctx.worldPos.y),
      width: Math.abs(ctx.worldPos.x - dragStartWorld.x),
      height: Math.abs(ctx.worldPos.y - dragStartWorld.y),
    })
    ctx.canvas.selectionArea.show()

    // Hit test and consolidate groups
    const enclosedIds = getShapesInSelectionBox(ctx.canvas, dragStartWorld, ctx.worldPos)
    const consolidatedIds = consolidateToGroups(ctx.canvas, enclosedIds)

    if (ctx.modifiers.shift && selectionAtDragStart.length > 0) {
      // Shift+drag: merge original selection with newly enclosed (deduplicated)
      const merged = [...new Set([...selectionAtDragStart, ...consolidatedIds])]
      updateSelectedIds(merged)
    } else {
      updateSelectedIds(consolidatedIds)
    }
  }

  return isDragging
}

function handleUp(ctx: PointerInputContext): boolean {
  if (!dragStartWorld) return false

  const wasActualDrag = isDragging

  if (wasActualDrag) {
    // Finish selection box
    ctx.canvas.selectionArea.hide()
  } else {
    ctx.canvas.elements.forEach(e => e.isSelected = false)
    // Simple click on empty space → clear selection
    setStore('canvasSlice', 'selectedIds', [])
  }

  // Reset state
  isDragging = false
  dragStartWorld = null
  selectionAtDragStart = []

  return true
}
