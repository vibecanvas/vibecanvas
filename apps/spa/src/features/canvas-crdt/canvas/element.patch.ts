import type { TCanvasDoc, TElement } from "@vibecanvas/shell";
import type { AElement } from "../renderables/element.abstract";
import type { Canvas } from "./canvas";
import type { Patch } from "@automerge/automerge/slim";
import { ArrowElement } from "../renderables/elements/arrow/arrow.class";
import { ChatElement } from "../renderables/elements/chat/chat.class";
import { DiamondElement } from "../renderables/elements/diamond/diamond.class";
import { EllipseElement } from "../renderables/elements/ellipse/ellipse.class";
import type { TBackendElementOf } from "../renderables/element.abstract";
import { ImageElement } from "../renderables/elements/image/image.class";
import { LineElement } from "../renderables/elements/line/line.class";
import { PenElement } from "../renderables/elements/pen/pen.class";
import { RectElement } from "../renderables/elements/rect/rect.class";
import { TextElement } from "../renderables/elements/text/text.class";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ElementMutation =
  | { type: 'created'; elementId: string }
  | { type: 'deleted'; elementId: string }
  | { type: 'updated'; elementId: string }

// ─────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────

export function applyPatches(
  canvas: Canvas,
  doc: TCanvasDoc,
  patches: Patch[]
): void {
  const mutations = groupPatchesByElement(patches)

  for (const mutation of mutations.values()) {
    switch (mutation.type) {
      case 'created':
        handleElementCreated(canvas, doc, mutation.elementId)
        break
      case 'deleted':
        handleElementDeleted(canvas, mutation.elementId)
        break
      case 'updated':
        handleElementUpdated(canvas, doc, mutation.elementId)
        break
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Patch Grouping
// ─────────────────────────────────────────────────────────────

function groupPatchesByElement(patches: Patch[]): Map<string, ElementMutation> {
  const mutations = new Map<string, ElementMutation>()

  for (const patch of patches) {
    if (patch.path[0] !== 'elements') continue
    if (patch.path.length < 2) continue

    const elementId = patch.path[1] as string

    // Delete takes precedence
    if (patch.action === 'del' && patch.path.length === 2) {
      mutations.set(elementId, { type: 'deleted', elementId })
      continue
    }

    // Create: put {} on ['elements', id]
    if (patch.action === 'put' && patch.path.length === 2) {
      if (!mutations.has(elementId)) {
        mutations.set(elementId, { type: 'created', elementId })
      }
      continue
    }

    // Update: any property change
    if (patch.path.length >= 3) {
      const existing = mutations.get(elementId)
      if (existing?.type === 'created' || existing?.type === 'deleted') continue

      mutations.set(elementId, { type: 'updated', elementId })
    }
  }

  return mutations
}

// ─────────────────────────────────────────────────────────────
// Mutation Handlers
// ─────────────────────────────────────────────────────────────

function handleElementCreated(canvas: Canvas, doc: TCanvasDoc, elementId: string): void {
  if (canvas.elements.has(elementId)) return

  const element = doc.elements[elementId]
  if (!element) return

  const renderable = createElementRenderable(element, canvas)
  if (!renderable) return

  canvas.elements.set(elementId, renderable)
  canvas.bottomLayer.attach(renderable.container)
  canvas.app.stage.addChild(renderable.container)
}

function handleElementDeleted(canvas: Canvas, elementId: string): void {
  const renderable = canvas.elements.get(elementId)
  if (!renderable) return

  renderable.destroy()
  canvas.elements.delete(elementId)
}

function handleElementUpdated(canvas: Canvas, doc: TCanvasDoc, elementId: string): void {
  const renderable = canvas.elements.get(elementId)
  if (!renderable) return

  const newData = doc.elements[elementId]
  if (!newData) return

  // Sync element data reference
  renderable.element = newData as any

  // Handle pen elements (no w/h, compute bounds from points)
  // PenElement.redraw() handles container positioning internally
  if (newData.data.type === 'pen') {
    renderable.container.rotation = newData.angle
    renderable.redraw()
    return
  }

  // Handle line/arrow elements (segments-based, no w/h)
  // LineElement.redraw() handles container positioning internally
  if (newData.data.type === 'line' || newData.data.type === 'arrow') {
    renderable.container.rotation = newData.angle
    renderable.redraw()
    return
  }

  // Handle other elements with w/h or rx/ry
  // Sync container transform from new data
  const w = 'w' in newData.data ? newData.data.w :
            'rx' in newData.data ? newData.data.rx * 2 : 0
  const h = 'h' in newData.data ? newData.data.h :
            'ry' in newData.data ? newData.data.ry * 2 : 0
  renderable.container.x = newData.x + w / 2
  renderable.container.y = newData.y + h / 2
  renderable.container.rotation = newData.angle

  // Always redraw
  renderable.redraw()
}

// ─────────────────────────────────────────────────────────────
// Element Factory
// ─────────────────────────────────────────────────────────────

function createElementRenderable(element: TElement, canvas: Canvas): AElement | null {
  switch (element.data.type) {
    case 'rect':
      return new RectElement(element as TBackendElementOf<'rect'>, canvas)
    case 'diamond':
      return new DiamondElement(element as TBackendElementOf<'diamond'>, canvas)
    case 'ellipse':
      return new EllipseElement(element as TBackendElementOf<'ellipse'>, canvas)
    case 'text':
      return new TextElement(element as TBackendElementOf<'text'>, canvas)
    case 'image':
      return new ImageElement(element as TBackendElementOf<'image'>, canvas)
    case 'line':
      return new LineElement(element as TBackendElementOf<'line'>, canvas)
    case 'arrow':
      return new ArrowElement(element as TBackendElementOf<'arrow'>, canvas)
    case 'pen':
      return new PenElement(element as TBackendElementOf<'pen'>, canvas)
    case 'chat':
      return new ChatElement(element as TBackendElementOf<'chat'>, canvas)
    default:
      console.warn(`Unknown element type: ${element.data.type}`)
      return null
  }
}
