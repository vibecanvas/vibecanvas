import { throttle } from "@solid-primitives/scheduled"
import type { InputCommand } from "./types"
import { setStore } from "@/store"

const MIN_SCALE = 0.1
const MAX_SCALE = 10

const updateCanvasScale = throttle((canvasId: string, scale: number) => {
  setStore('canvasSlice', 'canvasViewport', canvasId, 'scale', scale)
}, 10)

/**
 * Zoom canvas toward cursor with pinch/ctrl+wheel
 */
export const cmdZoom: InputCommand = (ctx) => {
  if (ctx.eventType !== 'wheel') return false
  if (!ctx.modifiers.ctrl && !ctx.modifiers.meta) return false
  if (!ctx.screenPos || !ctx.worldPos) return false

  const e = ctx.event as WheelEvent
  const stage = ctx.canvas.app.stage

  // Calculate new scale
  const delta = -e.deltaY * 0.01
  const oldScale = stage.scale.x
  const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale + delta))

  // Zoom toward cursor position
  // worldPos was calculated with old scale, so we use it to anchor the zoom
  stage.scale.set(newScale)
  stage.x = ctx.screenPos.x - ctx.worldPos.x * newScale
  stage.y = ctx.screenPos.y - ctx.worldPos.y * newScale
  ctx.canvas.notifyViewportChanged()

  updateCanvasScale(ctx.canvas.canvasId, newScale)

  return true
}
