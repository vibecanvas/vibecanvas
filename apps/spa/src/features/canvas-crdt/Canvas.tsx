import { getOrCreateRepo } from "@/services/automerge"
import { setStore, store } from "@/store"
import type { TBackendCanvas } from "@/types/backend.types"
import { type AutomergeUrl, type DocHandle } from "@automerge/automerge-repo"
import type { TCanvasDoc } from "@vibecanvas/shell"
import { onCleanup, onMount } from "solid-js"
import { Canvas } from "./canvas/canvas"
import type { TCanvasViewData, TDocState } from "./store/canvas.slice"
import { orpcWebsocketService } from "@/services/orpc-websocket"

export function CanvasComponent(props: { viewData: TCanvasViewData, canvasData: TBackendCanvas }) {
  if (!props.canvasData.automerge_url) return
  setStore('canvasSlice', 'docState', 'idle')

  const repo = getOrCreateRepo()
  onMount(async () => {
    setStore('canvasSlice', 'docState', 'awaiting-network')
    const url = props.canvasData.automerge_url as AutomergeUrl

    const findWithRetry = async (retries = 2): Promise<DocHandle<TCanvasDoc>> => {
      try {
        return await repo.find<TCanvasDoc>(url, {
          signal: AbortSignal.timeout(10_000),
        })
      } catch (e) {
        if (retries > 0) {
          console.warn('[CanvasComponent] find timed out, retrying...', e)
          return findWithRetry(retries - 1)
        }
        throw e
      }
    }

    const _handle = await findWithRetry()

    const updateState = () => {
      const state = _handle.state as TDocState
      setStore('canvasSlice', 'docState', state)
    }
    updateState()

    _handle.on('change', updateState)
    _handle.on('delete', () => setStore('canvasSlice', 'docState', 'deleted'))

    await _handle.whenReady()

    setStore('canvasSlice', 'docState', 'ready')
    // @ts-ignore
    window.handle = _handle
    Canvas.create({ handle: _handle, canvasId: props.canvasData.id, viewport: props.viewData, ref: window.document.getElementById('main')! })
      .then(c => setStore('canvasSlice', 'canvas', c))

    orpcWebsocketService.safeClient.api.db.events({ canvasId: props.canvasData.id }).then(async ([err, it]) => {
      if (err) return
      for await (const event of it) {
        const data = event.data

        if (data.change === 'update') {
          if (data.table === 'canvas') {
            setStore('canvasSlice', 'backendCanvas', data.id, (canvas) => canvas?.id === data.id ? data.record as TBackendCanvas : canvas)
          }
          if (data.table === 'chats') {
            setStore('chatSlice', 'backendChats', data.record.canvas_id, (chat) => chat.id === data.id, data.record)
          }
        }

        if (data.change === 'delete') {
          if (data.table === 'canvas') {
            setStore('canvasSlice', 'backendCanvas', data.id, undefined)
          }
          if (data.table === 'chats') {
            // For delete events, we need to search through all canvas IDs to find and remove the chat
            setStore('chatSlice', 'backendChats', chats => {
              const updated = { ...chats }
              for (const canvasId in updated) {
                updated[canvasId] = updated[canvasId].filter(chat => chat.id !== data.id)
              }
              return updated
            })
          }
        }
      }
    })
  })

  onCleanup(() => {
    store.canvasSlice.canvas?.cleanup()
    setStore('canvasSlice', 'canvas', null)
    setStore('canvasSlice', 'docState', 'idle')
  })


  return null
}
