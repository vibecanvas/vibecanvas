import { setStore } from "@/store"
import type { InputCommand } from "./types"
import { throttle } from "@solid-primitives/scheduled"


const updateCanvasViewport = throttle((canvasId: string, x: number, y: number) => {
  setStore('canvasSlice', 'canvasViewport', canvasId, v => ({ ...v, x, y }))
}, 10)

/**
 * Pan canvas with trackpad scroll (plain wheel without ctrl/meta)
 */
export const cmdPan: InputCommand = (ctx) => {
  if (ctx.eventType !== 'wheel') return false

  // Let zoom handle ctrl/meta+wheel
  if (ctx.modifiers.ctrl || ctx.modifiers.meta) return false

  const e = ctx.event
  const stage = ctx.canvas.app.stage

  stage.x -= e.deltaX
  stage.y -= e.deltaY
  ctx.canvas.notifyViewportChanged()

  updateCanvasViewport(ctx.canvas.canvasId, stage.x, stage.y)

  return true
}
