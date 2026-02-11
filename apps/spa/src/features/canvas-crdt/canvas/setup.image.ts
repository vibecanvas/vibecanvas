import { setStore } from "@/store"
import { orpcWebsocketService } from "@/services/orpc-websocket"
import { createElement } from "../input-commands/cmd.draw-new"
import { fileToBase64, getImageDimensions } from "../util/image.util"
import type { Canvas } from "./canvas"

type TSetupImageParams = {
  canvas: Canvas
}

type TImageFormat = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

const SUPPORTED_IMAGE_FORMATS = new Set<TImageFormat>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const)

function parseDataUrl(dataUrl: string): { format: TImageFormat; base64: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match?.[1] || !match?.[2]) return null
  const format = match[1] as TImageFormat
  if (!SUPPORTED_IMAGE_FORMATS.has(format)) return null
  return {
    format,
    base64: match[2],
  }
}

async function uploadImageToServer(dataUrl: string): Promise<string | null> {
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) {
    return null
  }

  const [error, result] = await orpcWebsocketService.safeClient.api.file.put({
    body: {
      base64: parsed.base64,
      format: parsed.format,
    }
  })

  if (error || !result) {
    throw new Error(error?.message ?? 'Failed to upload image')
  }

  return result.url
}

export function setupImageHandling({ canvas }: TSetupImageParams): () => void {
  const canvasEl = canvas.app.canvas

  // Handle image selection from toolbar file picker
  const imageSelectedHandler = async (e: Event) => {
    const customEvent = e as CustomEvent<{ file: File }>
    const file = customEvent.detail?.file
    if (!file) return

    try {
      const base64 = await fileToBase64(file)
      const { width, height } = await getImageDimensions(base64)
      const url = await uploadImageToServer(base64)
      if (!url) {
        throw new Error('Unsupported image format')
      }

      // Insert at canvas center (pass center position, insertImage handles sizing)
      const centerX = (canvas.app.screen.width / 2 - canvas.app.stage.x) / canvas.app.stage.scale.x
      const centerY = (canvas.app.screen.height / 2 - canvas.app.stage.y) / canvas.app.stage.scale.y

      insertImage(canvas, url, width, height, centerX, centerY)
    } catch (error) {
      console.error('[Canvas] Failed to load image:', error)
    }
  }
  window.addEventListener('canvas:image-selected', imageSelectedHandler)

  // Handle drag-drop of image files
  canvasEl.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.dataTransfer!.dropEffect = 'copy'
  })

  const dropHandler = async (e: DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer?.files[0]
    if (!file || !file.type.startsWith('image/')) return

    try {
      const base64 = await fileToBase64(file)
      const { width, height } = await getImageDimensions(base64)
      const url = await uploadImageToServer(base64)
      if (!url) {
        throw new Error('Unsupported image format')
      }

      // Convert screen position to world position (pass center position, insertImage handles sizing)
      const rect = canvasEl.getBoundingClientRect()
      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top
      const worldX = (screenX - canvas.app.stage.x) / canvas.app.stage.scale.x
      const worldY = (screenY - canvas.app.stage.y) / canvas.app.stage.scale.y

      insertImage(canvas, url, width, height, worldX, worldY)
    } catch (error) {
      console.error('[Canvas] Failed to load dropped image:', error)
    }
  }
  canvasEl.addEventListener('drop', dropHandler)

  // Handle paste events (Cmd+V / Ctrl+V)
  const pasteHandler = async (e: ClipboardEvent) => {
    const files = e.clipboardData?.files
    if (!files || files.length === 0) return

    const file = files[0]
    if (!file.type.startsWith('image/')) return

    e.preventDefault()

    try {
      const base64 = await fileToBase64(file)
      const { width, height } = await getImageDimensions(base64)
      const url = await uploadImageToServer(base64)
      if (!url) {
        throw new Error('Unsupported image format')
      }

      // Insert at canvas center (same as toolbar behavior)
      const centerX = (canvas.app.screen.width / 2 - canvas.app.stage.x) / canvas.app.stage.scale.x
      const centerY = (canvas.app.screen.height / 2 - canvas.app.stage.y) / canvas.app.stage.scale.y

      insertImage(canvas, url, width, height, centerX, centerY)
    } catch (error) {
      console.error('[Canvas] Failed to paste image:', error)
    }
  }
  window.addEventListener('paste', pasteHandler)

  // Return cleanup function
  return () => {
    window.removeEventListener('canvas:image-selected', imageSelectedHandler)
    canvasEl.removeEventListener('drop', dropHandler)
    window.removeEventListener('paste', pasteHandler)
  }
}

function insertImage(canvas: Canvas, url: string, naturalW: number, naturalH: number, x: number, y: number): void {
  // Calculate visible screen dimensions in world space
  const screenWidthWorld = canvas.app.screen.width / canvas.app.stage.scale.x
  const screenHeightWorld = canvas.app.screen.height / canvas.app.stage.scale.y

  // Target: 1/2 of the smaller screen dimension
  const maxDimension = Math.min(screenWidthWorld, screenHeightWorld) / 2

  // Scale to fit while maintaining aspect ratio
  const aspectRatio = naturalW / naturalH
  let w: number
  let h: number

  if (naturalW >= naturalH) {
    // Landscape or square - constrain by width
    w = Math.min(naturalW, maxDimension)
    h = w / aspectRatio
  } else {
    // Portrait - constrain by height
    h = Math.min(naturalH, maxDimension)
    w = h * aspectRatio
  }

  const element = createElement(
    crypto.randomUUID(),
    x - w / 2,  // Center horizontally (x is center point)
    y - h / 2,  // Center vertically (y is center point)
    {
      type: 'image',
      url,
      base64: null,
      w, h,
      crop: { x: 0, y: 0, width: naturalW, height: naturalH, naturalWidth: naturalW, naturalHeight: naturalH }
    },
    { opacity: 1 }
  )

  const elementId = element.id

  canvas.handle.change(doc => {
    doc.elements[elementId] = element
  })

  // Record undo entry
  canvas.undoManager.record({
    label: 'Insert Image',
    undo: () => {
      canvas.handle.change(doc => {
        delete doc.elements[elementId]
      })
    },
    redo: () => {
      canvas.handle.change(doc => {
        doc.elements[elementId] = { ...element }
      })
    }
  })

  // Select the new image
  setStore('canvasSlice', 'selectedIds', [elementId])
}
