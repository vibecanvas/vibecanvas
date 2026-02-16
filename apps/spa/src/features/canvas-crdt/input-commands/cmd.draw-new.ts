import { setStore, store } from "@/store"
import { DEFAULT_FILL_COLOR, DEFAULT_STROKE_COLOR, getRecentColorStorageKey } from "@/features/floating-selection-menu/types"
import type { TElement, TElementData, TElementStyle } from "@vibecanvas/shell/automerge/index"
import { Point } from "pixi.js"
import type { ExtractElementData, TBackendElementOf } from "../renderables/element.abstract"
import { ChatElement } from "../renderables/elements/chat/chat.class"
import { DiamondElement } from "../renderables/elements/diamond/diamond.class"
import { EllipseElement } from "../renderables/elements/ellipse/ellipse.class"
import { LineElement } from "../renderables/elements/line/line.class"
import { ArrowElement } from "../renderables/elements/arrow/arrow.class"
import { RectElement } from "../renderables/elements/rect/rect.class"
import { TextElement } from "../renderables/elements/text/text.class"
import { PenElement } from "../renderables/elements/pen/pen.class"
import { FiletreeElement } from "../renderables/elements/filetree/filetree.class"
import type { InputCommand, PointerInputContext } from "./types"
import { isElementTarget } from "./types"

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


const DRAWING_TOOLS = ['rectangle', 'diamond', 'ellipse', 'arrow', 'line', 'pen', 'text', 'image', 'chat', 'filesystem'] as const
const DRAG_THRESHOLD = 5

let isDragging = false
let dragStartWorld: Point | null = null

export const cmdDrawNew: InputCommand = (ctx) => {
  const tool = store.toolbarSlice.activeTool
  if (!DRAWING_TOOLS.includes(tool as any)) return false

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
  if (isElementTarget(ctx.commandTarget)) return false

  dragStartWorld = ctx.worldPos
  isDragging = false
  return true
}

function handleMove(ctx: PointerInputContext): boolean {
  if (!dragStartWorld || !ctx.worldPos) return false

  // Check drag threshold
  if (!isDragging) {
    const dx = ctx.worldPos.x - dragStartWorld.x
    const dy = ctx.worldPos.y - dragStartWorld.y
    if (Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) {
      isDragging = true
    }
  }

  if (!isDragging) return false

  const tool = store.toolbarSlice.activeTool
  const drawingDefaults = getDrawingStyleDefaults(ctx.canvas.canvasId)

  // Calculate bounds (shared for all shape tools)
  const x = Math.min(dragStartWorld.x, ctx.worldPos.x)
  const y = Math.min(dragStartWorld.y, ctx.worldPos.y)
  const w = Math.max(1, Math.abs(ctx.worldPos.x - dragStartWorld.x))
  const h = Math.max(1, Math.abs(ctx.worldPos.y - dragStartWorld.y))

  const preview = ctx.canvas.previewDrawing

  if (tool === 'rectangle') {
    if (!preview) {
      const {data, style} = createRectElementDataAndStyle(w, h, 0, drawingDefaults)
      // TODO: use smaller ids
      const element = createElement(crypto.randomUUID(), x, y, data, style)
      const renderable = new RectElement(element as TBackendElementOf<'rect'>, ctx.canvas)
      ctx.canvas.setPreviewElement(renderable)
    } else if (RectElement.isRectElement(preview)) {
      preview.element.x = x
      preview.element.y = y
      preview.element.data.w = w
      preview.element.data.h = h
      preview.redraw()
    }
  }

  if (tool === 'diamond') {
    if (!preview) {
      const {data, style} = createDiamondElementDataAndStyle(w, h, drawingDefaults)
      const element = createElement(crypto.randomUUID(), x, y, data, style)
      const renderable = new DiamondElement(element as TBackendElementOf<'diamond'>, ctx.canvas)
      ctx.canvas.setPreviewElement(renderable)
    } else if (DiamondElement.isDiamondElement(preview)) {
      preview.element.x = x
      preview.element.y = y
      preview.element.data.w = w
      preview.element.data.h = h
      preview.redraw()
    }
  }

  if (tool === 'ellipse') {
    // Ellipse uses radii (rx, ry) = half of width/height
    const rx = w / 2
    const ry = h / 2
    if (!preview) {
      const {data, style} = createEllipseElementDataAndStyle(rx, ry, drawingDefaults)
      const element = createElement(crypto.randomUUID(), x, y, data, style)
      const renderable = new EllipseElement(element as TBackendElementOf<'ellipse'>, ctx.canvas)
      ctx.canvas.setPreviewElement(renderable)
    } else if (EllipseElement.isEllipseElement(preview)) {
      preview.element.x = x
      preview.element.y = y
      preview.element.data.rx = rx
      preview.element.data.ry = ry
      preview.redraw()
    }
  }

  if (tool === 'line') {
    // Line: element position = start point, segments define endpoints relative to start
    const startX = dragStartWorld.x
    const startY = dragStartWorld.y
    const endX = ctx.worldPos.x
    const endY = ctx.worldPos.y

    if (!preview) {
      const { data, style } = createLineElementDataAndStyle(endX - startX, endY - startY, drawingDefaults)
      // Element position IS the start point (anchor-based, not bbox-based)
      const element = createElement(crypto.randomUUID(), startX, startY, data, style)
      const renderable = new LineElement(element as TBackendElementOf<'line'>, ctx.canvas)
      ctx.canvas.setPreviewElement(renderable)
    } else if (LineElement.isLineElement(preview)) {
      // Update points: first point at origin, second at delta
      preview.element.data.points = [
        [0, 0],
        [endX - startX, endY - startY]
      ]
      preview.redraw()
    }
  }

  if (tool === 'arrow') {
    // Arrow: same as line but with caps
    const startX = dragStartWorld.x
    const startY = dragStartWorld.y
    const endX = ctx.worldPos.x
    const endY = ctx.worldPos.y

    if (!preview) {
      const { data, style } = createArrowElementDataAndStyle(endX - startX, endY - startY, drawingDefaults)
      // Element position IS the start point (anchor-based, not bbox-based)
      const element = createElement(crypto.randomUUID(), startX, startY, data, style)
      const renderable = new ArrowElement(element as TBackendElementOf<'arrow'>, ctx.canvas)
      ctx.canvas.setPreviewElement(renderable)
    } else if (ArrowElement.isArrowElement(preview)) {
      // Update points: first point at origin, second at delta
      preview.element.data.points = [
        [0, 0],
        [endX - startX, endY - startY]
      ]
      preview.redraw()
    }
  }

  if (tool === 'pen') {
    // Pen: accumulates points during drag (freehand drawing)
    const currentX = ctx.worldPos.x
    const currentY = ctx.worldPos.y

    if (!preview) {
      // First point - create element at current position
      const hasPressure = getPressureSupported(ctx.event)
      const { data, style } = createPenElementDataAndStyle(hasPressure, drawingDefaults)
      // First point at origin relative to element position
      data.points = [[0, 0]]
      data.pressures = [getPressure(ctx.event)]

      const element = createElement(crypto.randomUUID(), currentX, currentY, data, style)
      const renderable = new PenElement(element as TBackendElementOf<'pen'>, ctx.canvas)
      ctx.canvas.setPreviewElement(renderable)
    } else if (PenElement.isPenElement(preview)) {
      // Accumulate points relative to element origin
      const relX = currentX - preview.element.x
      const relY = currentY - preview.element.y

      // Skip points too close together for performance
      const lastPoint = preview.element.data.points.at(-1)
      if (lastPoint) {
        const dx = relX - lastPoint[0]
        const dy = relY - lastPoint[1]
        if (Math.sqrt(dx * dx + dy * dy) < 2) return true // Skip
      }

      preview.element.data.points.push([relX, relY])
      preview.element.data.pressures.push(getPressure(ctx.event))
      preview.redraw()
    }
  }

  return true
}

type TDrawingStyleDefaults = {
  fillColor: string
  strokeColor: string
}

function readRecentColor(mode: 'fill' | 'stroke', canvasId: string | null | undefined): string | null {
  if (typeof localStorage === 'undefined') return null

  const key = getRecentColorStorageKey(mode, canvasId)
  const raw = localStorage.getItem(key)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const value = parsed[0]
    if (typeof value !== 'string') return null
    return value
  } catch {
    return null
  }
}

function isValidHexColor(value: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)
}

function getDrawingStyleDefaults(canvasId: string): TDrawingStyleDefaults {
  const recentFill = readRecentColor('fill', canvasId)
  const recentStroke = readRecentColor('stroke', canvasId)

  const fillColor = recentFill === 'transparent'
    ? 'transparent'
    : (recentFill && isValidHexColor(recentFill) ? recentFill : DEFAULT_FILL_COLOR)

  const strokeColor = recentStroke && isValidHexColor(recentStroke)
    ? recentStroke
    : DEFAULT_STROKE_COLOR

  return { fillColor, strokeColor }
}

function handleUp(ctx: Parameters<InputCommand>[0]): boolean {
  if (!dragStartWorld) return false

  const wasDragging = isDragging
  const tool = store.toolbarSlice.activeTool

  if (wasDragging && (tool === 'rectangle' || tool === 'diamond' || tool === 'ellipse' || tool === 'line' || tool === 'arrow' || tool === 'pen')) {
    // Finalize preview -> move to bottomLayer + add to renderers
    const finalized = ctx.canvas.finalizePreviewElement()

    // Persist to backend
    if (finalized) {
      // Capture element data for undo/redo closures
      const elementId = finalized.id
      const elementData = { ...finalized.element }

      ctx.canvas.handle.change(doc => {
        doc.elements[elementId] = finalized.element
      })

      // Record undo entry
      ctx.canvas.undoManager.record({
        label: 'Draw',
        undo: () => {
          ctx.canvas.handle.change(doc => {
            delete doc.elements[elementId]
          })
        },
        redo: () => {
          ctx.canvas.handle.change(doc => {
            doc.elements[elementId] = { ...elementData }
          })
        }
      })
    }
    // Pen tool stays active for continuous drawing, other tools switch to select
    if (tool !== 'pen') {
      setStore('toolbarSlice', 'activeTool', 'select')
    }
  } else if (!wasDragging && tool === 'text') {
    // Text: create on single click (no drag)
    const drawingDefaults = getDrawingStyleDefaults(ctx.canvas.canvasId)
    const { data, style } = createTextElementDataAndStyle(drawingDefaults)
    const element = createElement(
      crypto.randomUUID(),
      dragStartWorld.x,
      dragStartWorld.y,
      data,
      style
    )
    const renderable = new TextElement(element as TBackendElementOf<'text'>, ctx.canvas)

    // Add to canvas
    ctx.canvas.addElement(renderable)

    // Persist to CRDT
    const elementId = renderable.id
    const elementData = { ...renderable.element }

    ctx.canvas.handle.change(doc => {
      doc.elements[elementId] = renderable.element
    })

    // Record undo entry
    ctx.canvas.undoManager.record({
      label: 'Create Text',
      undo: () => {
        ctx.canvas.handle.change(doc => {
          delete doc.elements[elementId]
        })
      },
      redo: () => {
        ctx.canvas.handle.change(doc => {
          doc.elements[elementId] = { ...elementData }
        })
      }
    })

    setStore('toolbarSlice', 'activeTool', 'select')

    // Enter edit mode after tool switch side-effects settle (focus can change)
    requestAnimationFrame(() => {
      renderable.dispatch({ type: 'enter' })
    })
  } else if (!wasDragging && tool === 'chat') {
    // Chat: create on single click (no drag)
    const { data, style } = createChatElementDataAndStyle()
    const element = createElement(
      crypto.randomUUID(),
      dragStartWorld.x,
      dragStartWorld.y,
      data,
      style
    )
    const renderable = new ChatElement(element as TBackendElementOf<'chat'>, ctx.canvas)

    // Add to canvas
    ctx.canvas.addElement(renderable)

    // Persist to CRDT
    const elementId = renderable.id
    const elementData = { ...renderable.element }

    ctx.canvas.handle.change(doc => {
      doc.elements[elementId] = renderable.element
    })

    // Record undo entry
    ctx.canvas.undoManager.record({
      label: 'Create Chat',
      undo: () => {
        ctx.canvas.handle.change(doc => {
          delete doc.elements[elementId]
        })
      },
      redo: () => {
        ctx.canvas.handle.change(doc => {
          doc.elements[elementId] = { ...elementData }
        })
      }
    })

    setStore('toolbarSlice', 'activeTool', 'select')
  } else if (!wasDragging && tool === 'filesystem') {
    const { data, style } = createFiletreeElementDataAndStyle()
    const element = createElement(
      crypto.randomUUID(),
      dragStartWorld.x,
      dragStartWorld.y,
      data,
      style
    )
    const renderable = new FiletreeElement(element as TBackendElementOf<'filetree'>, ctx.canvas)

    ctx.canvas.addElement(renderable)

    const elementId = renderable.id
    const elementData = { ...renderable.element }

    ctx.canvas.handle.change(doc => {
      doc.elements[elementId] = renderable.element
    })

    ctx.canvas.undoManager.record({
      label: 'Create File Tree',
      undo: () => {
        ctx.canvas.handle.change(doc => {
          delete doc.elements[elementId]
        })
      },
      redo: () => {
        ctx.canvas.handle.change(doc => {
          doc.elements[elementId] = { ...elementData }
        })
      }
    })

    setStore('toolbarSlice', 'activeTool', 'select')
  } else {
    // Cancel preview if not dragging
    ctx.canvas.clearPreviewElement()
  }

  // Reset state
  isDragging = false
  dragStartWorld = null

  return true
}

// ─────────────────────────────────────────────────────────────
// Drawing Data Factories
// ─────────────────────────────────────────────────────────────

function createRectElementDataAndStyle(
  w: number,
  h: number,
  radius: number,
  defaults: TDrawingStyleDefaults,
): {data: ExtractElementData<'rect'>, style: TElementStyle} {
  return {
    data: { type: 'rect', w, h, radius },
    style: {
      backgroundColor: defaults.fillColor,
      strokeColor: defaults.strokeColor,
      strokeWidth: 2,
      opacity: 1,
    },
  }
}

function createDiamondElementDataAndStyle(w: number, h: number, defaults: TDrawingStyleDefaults): {data: ExtractElementData<'diamond'>, style: TElementStyle} {
  return {
    data: { type: 'diamond', w, h },
    style: {
      backgroundColor: defaults.fillColor,
      strokeColor: defaults.strokeColor,
      strokeWidth: 2,
      opacity: 1,
    },
  }
}

function createEllipseElementDataAndStyle(rx: number, ry: number, defaults: TDrawingStyleDefaults): {data: ExtractElementData<'ellipse'>, style: TElementStyle} {
  return {
    data: { type: 'ellipse', rx, ry },
    style: {
      backgroundColor: defaults.fillColor,
      strokeColor: defaults.strokeColor,
      strokeWidth: 2,
      opacity: 1,
    },
  }
}

function createTextElementDataAndStyle(defaults: TDrawingStyleDefaults): {data: ExtractElementData<'text'>, style: TElementStyle} {
  return {
    data: {
      type: 'text',
      w: 100,
      h: 24,
      text: 'Text',
      originalText: 'Text',
      fontSize: 16,
      fontFamily: 'Gabriele',
      textAlign: 'left',
      verticalAlign: 'top',
      lineHeight: 1.2,
      link: null,
      containerId: null,
      autoResize: true,
    },
    style: {
      backgroundColor: 'transparent',
      strokeColor: defaults.strokeColor,
      strokeWidth: 0,
      opacity: 1,
    },
  }
}

function createLineElementDataAndStyle(
  deltaX: number,
  deltaY: number,
  defaults: TDrawingStyleDefaults,
): { data: ExtractElementData<'line'>, style: TElementStyle } {
  // Points are relative to element position (first point at origin)
  // Points array: [[0, 0], [x1, y1], ...] - curves auto-computed at render time
  return {
    data: {
      type: 'line',
      lineType: 'curved',
      points: [
        [0, 0],           // Explicit first point at origin (like Excalidraw)
        [deltaX, deltaY]  // End point relative to origin
      ],
      startBinding: null,
      endBinding: null,
    },
    style: {
      strokeColor: defaults.strokeColor,
      strokeWidth: 2,
      opacity: 1,
    },
  }
}

function createArrowElementDataAndStyle(
  deltaX: number,
  deltaY: number,
  defaults: TDrawingStyleDefaults,
): { data: ExtractElementData<'arrow'>, style: TElementStyle } {
  // Arrow inherits line structure with caps at endpoints
  // Points array: [[0, 0], [x1, y1], ...] - curves auto-computed at render time
  // Default: no start cap, arrow head at end
  return {
    data: {
      type: 'arrow',
      lineType: 'curved',
      points: [
        [0, 0],           // Explicit first point at origin (like Excalidraw)
        [deltaX, deltaY]  // End point relative to origin
      ],
      startBinding: null,
      endBinding: null,
      startCap: 'none',
      endCap: 'arrow',  // Default: arrow head at end
    },
    style: {
      strokeColor: defaults.strokeColor,
      strokeWidth: 2,
      opacity: 1,
    },
  }
}

function createPenElementDataAndStyle(hasPressure: boolean = false, defaults: TDrawingStyleDefaults): {
  data: ExtractElementData<'pen'>
  style: TElementStyle
} {
  return {
    data: {
      type: 'pen',
      points: [],
      pressures: [],
      simulatePressure: !hasPressure, // Only simulate if no real pressure
    },
    style: {
      strokeColor: defaults.strokeColor,
      strokeWidth: 4,
      opacity: 1,
    },
  }
}

function createChatElementDataAndStyle(): {
  data: ExtractElementData<'chat'>
  style: TElementStyle
} {
  return {
    data: {
      type: 'chat',
      title: 'Chat',
      sessionId: null,
      w: 300,
      h: 500,
      isCollapsed: false,
    },
    style: {
      backgroundColor: '#9775fa',
      strokeColor: '#7950f2',
      strokeWidth: 2,
      opacity: 1,
    },
  }
}

function createFiletreeElementDataAndStyle(): {
  data: ExtractElementData<'filetree'>
  style: TElementStyle
} {
  return {
    data: {
      type: 'filetree',
      title: 'File Tree',
      w: 360,
      h: 460,
      isCollapsed: false,
      globPattern: null,
    },
    style: {
      backgroundColor: '#f8f9fa',
      strokeColor: '#ced4da',
      strokeWidth: 1,
      opacity: 1,
    },
  }
}

// ─────────────────────────────────────────────────────────────
// Pressure Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get pressure from PointerEvent if available, otherwise return default.
 */
function getPressure(event: Event): number {
  if (event instanceof PointerEvent && event.pressure > 0) {
    return event.pressure
  }
  return 0.5 // Default for mouse without pressure
}

/**
 * Detect if device supports pressure (e.g., tablet/stylus).
 * Returns true if pressure is between 0 and 1 (exclusive).
 */
function getPressureSupported(event: Event): boolean {
  return event instanceof PointerEvent && event.pressure > 0 && event.pressure < 1
}
