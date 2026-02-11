import { getOrCreateRepo } from "@/services/automerge"
import { setStore, store } from "@/store"
import type { TBackendCanvas } from "@/types/backend.types"
import { type AutomergeUrl, type DocHandle } from "@automerge/automerge-repo"
import type { TCanvasDoc } from "@vibecanvas/shell"
import { onCleanup, onMount } from "solid-js"
import { Canvas } from "./canvas/canvas"
import type { TCanvasViewData, TDocState } from "./store/canvas.slice"
import { orpcWebsocketService } from "@/services/orpc-websocket"

export function CanvasComponent(props: {viewData: TCanvasViewData, canvasData: TBackendCanvas}) {
  if(!props.canvasData.automerge_url) return
  setStore('canvasSlice', 'docState', 'idle')

  const repo = getOrCreateRepo()
  onMount(async () => {
    setStore('canvasSlice', 'docState', 'awaiting-network')
    const url = props.canvasData.automerge_url as AutomergeUrl

    const findWithRetry = async (retries = 2): Promise<DocHandle<TCanvasDoc>> => {
      const handle = await repo.find<TCanvasDoc>(url)
      const ready = await Promise.race([
        handle.whenReady().then(() => true),
        new Promise<false>(r => setTimeout(() => r(false), 5000)),
      ])
      if (ready) return handle
      if (retries > 0) return findWithRetry(retries - 1)
      return handle // give up retrying, return handle as-is
    }

    const _handle = await findWithRetry()

    // Track state changes
    const updateState = () => {
      const state = _handle.state as TDocState
      setStore('canvasSlice', 'docState', state)
    }
    updateState()

    _handle.on('change', updateState)
    _handle.on('delete', () => setStore('canvasSlice', 'docState', 'deleted'))

    // Wait for handle to be ready (will resolve immediately if it's already ready)
    await _handle.whenReady()

    setStore('canvasSlice', 'docState', 'ready')
    // @ts-ignore
    window.handle = _handle
    Canvas.create({ handle: _handle, canvasId: props.canvasData.id, viewport: store.canvasSlice.canvasViewportActive!, ref: window.document.getElementById('main')! })
    .then(c => {
      setStore('canvasSlice', 'canvas', c)
    })

    orpcWebsocketService.safeClient.api.db.events({ canvasId: props.canvasData.id }).then(async ([err, it]) => {
      if(err) return console.error(err)
      for await (const event of it) {
        console.log('db change event', event.data)
        if(event.data.change === 'update') {
          if (event.data.table === 'canvas') setStore('canvasSlice', 'backendCanvas', event.data.id, (canvas) => canvas.id === event.data.id ? event.data.record : canvas)
          if (event.data.table === 'chats') setStore('chatSlice', 'backendChats', event.data.record.canvas_id, (chat) => chat.id === event.data.id, event.data.record)
        }
        if(event.data.change === 'delete') {
          // @ts-expect-error undefined means deleted
          if(event.data.table === 'canvas')  setStore('canvasSlice', 'backendCanvas', event.data.id, undefined)
          if(event.data.table === 'chats')  setStore('chatSlice', 'backendChats', event.data.record.canvas_id, chats => chats.filter(chat => chat.id !== event.data.id))

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
