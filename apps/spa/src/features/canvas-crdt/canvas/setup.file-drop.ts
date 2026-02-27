import { orpcWebsocketService } from "@/services/orpc-websocket"
import { setStore } from "@/store"
import { createElement } from "@vibecanvas/core/automerge/fn.create-element"
import type { TFileData } from "@vibecanvas/shell"
import type { Canvas } from "./canvas"

const FILETREE_CHAT_DND_MIME = "application/x-vibecanvas-filetree-node"

type TDroppedNode = {
  path: string
  name: string
  is_dir: boolean
}

function getRenderer(path: string): TFileData['renderer'] {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  switch (ext) {
    case 'pdf':
      return 'pdf'
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'webp': case 'svg': case 'ico': case 'bmp':
      return 'image'
    case 'mp4': case 'webm': case 'mov': case 'avi': case 'mkv':
      return 'video'
    case 'mp3': case 'wav': case 'ogg': case 'flac': case 'aac':
      return 'audio'
    case 'md': case 'mdx':
      return 'markdown'
    case 'ts': case 'tsx': case 'js': case 'jsx': case 'json': case 'css': case 'html': case 'py':
    case 'rs': case 'go': case 'java': case 'c': case 'cpp': case 'h': case 'rb': case 'sh':
    case 'yaml': case 'yml': case 'toml': case 'xml': case 'sql': case 'graphql': case 'vue':
    case 'svelte': case 'astro': case 'zig': case 'lua': case 'swift': case 'kt':
      return 'code'
    case 'txt': case 'log': case 'csv': case 'env': case 'gitignore': case 'editorconfig':
      return 'text'
    default:
      return 'unknown'
  }
}

export function setupFileDropHandling({ canvas }: { canvas: Canvas }): () => void {
  const canvasEl = canvas.app.canvas

  const dropHandler = async (e: DragEvent) => {
    const filetreeData = e.dataTransfer?.getData(FILETREE_CHAT_DND_MIME)
    if (!filetreeData) return

    e.preventDefault()

    let node: TDroppedNode
    try {
      node = JSON.parse(filetreeData) as TDroppedNode
    } catch {
      return
    }

    const rect = canvasEl.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const worldX = (screenX - canvas.app.stage.x) / canvas.app.stage.scale.x
    const worldY = (screenY - canvas.app.stage.y) / canvas.app.stage.scale.y

    if (node.is_dir) {
      await orpcWebsocketService.client.api.filetree.create({
        canvas_id: canvas.canvasId,
        path: node.path,
        x: worldX,
        y: worldY,
      })
      return
    }

    const renderer = getRenderer(node.path)
    const w = 360
    const h = 300

    const element = createElement(
      crypto.randomUUID(),
      worldX - w / 2,
      worldY - h / 2,
      {
        type: 'file',
        w,
        h,
        path: node.path,
        renderer,
        isCollapsed: false,
      } satisfies TFileData,
      { opacity: 1 },
    )

    const elementId = element.id

    canvas.handle.change(doc => {
      doc.elements[elementId] = element
    })

    canvas.undoManager.record({
      label: 'Insert File',
      undo: () => {
        canvas.handle.change(doc => {
          delete doc.elements[elementId]
        })
      },
      redo: () => {
        canvas.handle.change(doc => {
          doc.elements[elementId] = { ...element }
        })
      },
    })

    setStore('canvasSlice', 'selectedIds', [elementId])
  }

  const dragOverHandler = (e: DragEvent) => {
    if (!e.dataTransfer?.types.includes(FILETREE_CHAT_DND_MIME)) return
    e.preventDefault()
    e.dataTransfer!.dropEffect = 'copy'
  }

  canvasEl.addEventListener('dragover', dragOverHandler)
  canvasEl.addEventListener('drop', dropHandler)

  return () => {
    canvasEl.removeEventListener('dragover', dragOverHandler)
    canvasEl.removeEventListener('drop', dropHandler)
  }
}
