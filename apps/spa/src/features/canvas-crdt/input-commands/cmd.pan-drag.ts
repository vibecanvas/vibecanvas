import type { InputCommand } from "./types"
import { isCanvasTarget } from "./types"
import { store, setStore } from "@/store"
import { throttle } from "@solid-primitives/scheduled"
import { Point } from "pixi.js"

// Pan state (closure)
let isPanning = false
let lastScreenPos: Point | null = null
let panCanvas: HTMLCanvasElement | null = null

const updateCanvasViewport = throttle((canvasId: string, x: number, y: number) => {
  setStore('canvasSlice', 'canvasViewport', canvasId, v => ({ ...v, x, y }))
}, 10)

/**
 * Pan canvas by dragging when hand tool is active.
 * Triggered when:
 * - Hand tool is selected (via 'h' key or toolbar)
 * - Space is held (temporary hand tool via cmdToolSelect)
 */
export const cmdPanDrag: InputCommand = (ctx) => {
  // Only handle when hand tool is active
  if (store.toolbarSlice.activeTool !== 'hand') return false

  // Only handle stage events (not shape events)
  if (!isCanvasTarget(ctx.commandTarget)) return false

  switch (ctx.eventType) {
    case 'pointerdown':
      return handleDown(ctx)
    case 'pointermove':
      return handleMove(ctx)
    case 'pointerup':
    case 'pointerupoutside':
      return handleUp()
    default:
      return false
  }
}

function handleDown(ctx: Parameters<InputCommand>[0]): boolean {
  if (!ctx.screenPos) return false

  isPanning = true
  lastScreenPos = ctx.screenPos
  panCanvas = ctx.canvas.app.canvas

  // Set cursor to grabbing
  panCanvas.style.cursor = 'grabbing'

  return true
}

function handleMove(ctx: Parameters<InputCommand>[0]): boolean {
  if (!isPanning || !lastScreenPos || !ctx.screenPos) return false

  const stage = ctx.canvas.app.stage

  // Calculate delta in screen space (not world space, since we're moving the stage)
  const deltaX = ctx.screenPos.x - lastScreenPos.x
  const deltaY = ctx.screenPos.y - lastScreenPos.y

  // Update stage position
  stage.x += deltaX
  stage.y += deltaY
  ctx.canvas.notifyViewportChanged()

  // Update store
  updateCanvasViewport(ctx.canvas.canvasId, stage.x, stage.y)

  // Update last position
  lastScreenPos = ctx.screenPos

  return true
}

function handleUp(): boolean {
  if (!isPanning) return false

  // Reset cursor to grab (still in hand mode)
  if (panCanvas) {
    panCanvas.style.cursor = 'grab'
  }

  isPanning = false
  lastScreenPos = null
  panCanvas = null

  return true
}
