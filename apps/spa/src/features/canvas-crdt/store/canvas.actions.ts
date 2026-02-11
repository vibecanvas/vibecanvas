import { TBackendCanvas } from "@/types/backend.types";
import { activeCanvasId, setActiveCanvasId, setStore, store } from "@/store";
import { orpcWebsocketService } from "@/services/orpc-websocket";

type TCreateCanvasBody = Parameters<typeof orpcWebsocketService.client.api.canvas.create>[0]
type TUpdateCanvasBody = NonNullable<Parameters<typeof orpcWebsocketService.client.api.canvas.update>[0]>["body"]

function normalizeCanvasDates(canvas: TBackendCanvas): TBackendCanvas {
  return {
    ...canvas,
    created_at: new Date(canvas.created_at),
  }
}

export async function createCanvas(canvas: Pick<TCreateCanvasBody, "name" | "path" | "automerge_url">): Promise<boolean> {
  return orpcWebsocketService.client.api.canvas.create(canvas)
    .then((response) => {
      setStore('canvasSlice', 'backendCanvas', response.id, normalizeCanvasDates(response))
      setStore('canvasSlice', 'canvasViewport', response.id, { x: 0, y: 0, scale: 1 })
      setActiveCanvasId(response.id)
      return true
    })
    .catch(() => false)
}

export async function updateCanvas(canvasId: string, updates: Partial<TUpdateCanvasBody>): Promise<boolean> {
  return orpcWebsocketService.client.api.canvas.update({ params: { id: canvasId }, body: updates })
    .then((response) => {
      setStore('canvasSlice', 'backendCanvas', canvasId, normalizeCanvasDates(response))
      return true
    })
    .catch(() => false)
}

export async function deleteCanvas(canvasId: string): Promise<boolean> {
  return orpcWebsocketService.client.api.canvas.remove({ params: { id: canvasId } })
    .then(() => {
      setStore('canvasSlice', 'backendCanvas', canvasId, undefined!)
      setStore('canvasSlice', 'canvasViewport', canvasId, undefined!)
      if (activeCanvasId() === canvasId) {
        const remainingIds = Object.keys(store.canvasSlice.backendCanvas)
        setActiveCanvasId(remainingIds.length > 0 ? remainingIds[0] : null)
      }
      return true
    })
    .catch(() => false)
}
