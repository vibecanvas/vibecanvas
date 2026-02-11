import { store } from "@/store";
import type { DocHandle, DocHandleChangePayload } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/shell";
import { createEffect, createRoot } from "solid-js";
import { z } from "zod";
import type { TBackendElementOf } from "../renderables/element.abstract";
import { ArrowElement } from "../renderables/elements/arrow/arrow.class";
import { ChatElement } from "../renderables/elements/chat/chat.class";
import { DiamondElement } from "../renderables/elements/diamond/diamond.class";
import { EllipseElement } from "../renderables/elements/ellipse/ellipse.class";
import { ImageElement } from "../renderables/elements/image/image.class";
import { LineElement } from "../renderables/elements/line/line.class";
import { RectElement } from "../renderables/elements/rect/rect.class";
import { TextElement } from "../renderables/elements/text/text.class";
import type { Canvas } from "./canvas";
import { applyPatches } from "./element.patch";
import { PenElement } from "../renderables/elements/pen/pen.class";

// Binding schema
const bindingSchema = z.object({
  targetId: z.string(),
  anchor: z.object({
    x: z.number(),
    y: z.number(),
  }),
})

// Element style schema
const elementStyleSchema = z.object({
  backgroundColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().optional(),
  cornerRadius: z.number().optional(),
  borderColor: z.string().optional(),
  headerColor: z.string().optional(),
})

// Base element schema (common fields)
const baseElementSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  angle: z.number(),
  zIndex: z.string(),
  parentGroupId: z.string().nullable(),
  bindings: z.array(bindingSchema),
  locked: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

// Element data schema (discriminated by type)
const elementDataSchema = z.object({
  type: z.enum(['rect', 'ellipse', 'diamond', 'arrow', 'line', 'pen', 'text', 'image', 'chat', 'filetree']),
}).passthrough()

// Full element schema
const elementSchema = baseElementSchema.extend({
  data: elementDataSchema,
  style: elementStyleSchema,
})

function validateElement(element: unknown): boolean {
  const result = elementSchema.safeParse(element)
  if (!result.success) {
    console.warn('[setupDocSync] Invalid element:', result.error.flatten())
    return false
  }
  return true
}

export function setupDocSync(canvas: Canvas, handle: DocHandle<TCanvasDoc>) {
  // Initialize elements with validation
  for (const element of Object.values(handle.doc().elements)) {
    if (!validateElement(element)) {
      console.warn('[setupDocSync] Skipping invalid element:', element)
      continue
    }

    if (element.data.type === 'rect') {
      const rectElement = new RectElement(element as TBackendElementOf<'rect'>, canvas)
      canvas.addElement(rectElement)
    }
    else if (element.data.type === 'diamond') {
      const diamondElement = new DiamondElement(element as TBackendElementOf<'diamond'>, canvas)
      canvas.addElement(diamondElement)
    }
    else if (element.data.type === 'ellipse') {
      const ellipseElement = new EllipseElement(element as TBackendElementOf<'ellipse'>, canvas)
      canvas.addElement(ellipseElement)
    }
    else if (element.data.type === 'pen') {
      const penElement = new PenElement(element as TBackendElementOf<'pen'>, canvas)
      canvas.addElement(penElement)
    }
    else if (element.data.type === 'line') {
      const lineElement = new LineElement(element as TBackendElementOf<'line'>, canvas)
      canvas.addElement(lineElement)
    }
    else if (element.data.type === 'arrow') {
      const arrowElement = new ArrowElement(element as TBackendElementOf<'arrow'>, canvas)
      canvas.addElement(arrowElement)
    }
    else if (element.data.type === 'text') {
      const textElement = new TextElement(element as TBackendElementOf<'text'>, canvas)
      canvas.addElement(textElement)
    }
    else if (element.data.type === 'image') {
      const imageElement = new ImageElement(element as TBackendElementOf<'image'>, canvas)
      canvas.addElement(imageElement)
    }
    else if (element.data.type === 'chat') {
      const chatElement = new ChatElement(element as TBackendElementOf<'chat'>, canvas)
      canvas.addElement(chatElement)
    }
  }

  // Initialize groups from document
  canvas.groupManager.initializeFromDoc()

  const changeHandler = (payload: DocHandleChangePayload<TCanvasDoc>) => {
    const doc = handle.doc()
    if (!doc) return

    // Apply element patches
    applyPatches(canvas, doc, payload.patches)

    // Handle group patches
    canvas.groupManager.applyPatches(payload.patches)
  }
  handle.on('change', changeHandler)

  const disposeLocalStore = listenLocalStore(canvas)

  return () => {
    handle.off('change', changeHandler)
    disposeLocalStore()
  }
}

const listenLocalStore = (canvas: Canvas) => {
  const dispose = createRoot((dispose) => {
    // React to selection changes from store
    createEffect(() => {
      const selectedIds = store.canvasSlice.selectedIds

      // First, deselect all groups
      canvas.groupManager.groups.forEach(g => {
        g.deselect()
      })

      // First, deselect all elements
      canvas.elements.forEach(r => {
        r.isSelected = false
      })

      // Check if single selection is a group
      if (selectedIds.length === 1) {
        const id = selectedIds[0]
        const virtualGroup = canvas.groupManager.groups.get(id)
        if (virtualGroup) {
          // It's a group selection - show group's TransformBox in full mode
          virtualGroup.transformBox?.setMode('full')
          virtualGroup.select()

          // Member elements show 'frame' mode (just outlines)
          for (const member of virtualGroup.members) {
            if (member.transformBox) {
              member.transformBox.setMode('frame')
            }
            member.isSelected = true
          }

          // Hide multiTransformBox - group uses its own TransformBox
          canvas.multiTransformBox.hide()
          return // Early return - group selection handled
        }

        // Single element selection
        const element = canvas.elements.get(id)
        if (element) {
          if (element.transformBox) {
            element.transformBox.setMode('full')
          }
          element.isSelected = true
        }
        canvas.multiTransformBox.hide()
        return
      }

      // Multi-selection (selectedIds.length > 1)
      if (selectedIds.length > 1) {
        // Resolve both elements and groups
        const members: typeof canvas.multiTransformBox.members = []

        for (const id of selectedIds) {
          // Try element first
          const element = canvas.elements.get(id)
          if (element) {
            element.isSelected = true
            element.transformBox?.setMode('frame')
            members.push(element)
            continue
          }

          // Try group
          const group = canvas.groupManager.groups.get(id)
          if (group) {
            group.isSelected = true
            group.transformBox?.setMode('frame')
            // Also mark group members with frame mode
            for (const member of group.members) {
              member.isSelected = true
              member.transformBox?.setMode('frame')
            }
            members.push(group)
          }
        }

        if (members.length > 0) {
          canvas.multiTransformBox.members = members
          canvas.multiTransformBox.show()
        }
      } else {
        // Empty selection
        canvas.multiTransformBox.hide()
      }
    })

    createEffect(() => {
      const activeTool = store.toolbarSlice.activeTool
      if (activeTool === 'select') {
        canvas.app.canvas.style.cursor = 'default'
        canvas.app.stage.cursor = 'default'
      } else if (activeTool === 'rectangle' || activeTool === 'diamond' || activeTool === 'ellipse' || activeTool === 'line' || activeTool === 'arrow' || activeTool === 'pen' || activeTool === 'text' || activeTool === 'image') {
        canvas.app.canvas.style.cursor = 'crosshair'
        canvas.app.stage.cursor = 'crosshair'
      } else if (activeTool === 'hand') {
        canvas.app.canvas.style.cursor = 'grab'
        canvas.app.stage.cursor = 'grab'
      } else {
        canvas.app.canvas.style.cursor = 'default'
        canvas.app.stage.cursor = 'default'
      }
    })

    return dispose
  })

  return dispose
}
