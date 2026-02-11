import { createEffect, createRoot, createSignal } from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import { showErrorToast } from "./components/ui/Toast";
import type { TCanvasSlice, TCanvasViewData } from "./features/canvas-crdt/store/canvas.slice";
import type { TChatSlice } from "./features/chat/store/chat.slice";
import { type TContextMenuSlice, defaultContextMenuSlice } from "./features/context-menu/store/context-menu.slice";
import type { TToolbarSlice } from "./features/floating-drawing-toolbar/store/toolbar.slice";
import type { Tool } from "./features/floating-drawing-toolbar/types/toolbar.types";
import { orpcWebsocketService } from "./services/orpc-websocket";
import type { TBackendCanvas, TBackendChat } from "./types/backend.types";

type TGlobalSlice = {
  theme: "light" | "dark"
  sidebarVisible: boolean
}


export type TStore = TGlobalSlice & TToolbarSlice & TCanvasSlice & TChatSlice & TContextMenuSlice

const STORAGE_KEY = 'vibecanvas-store';

type TPersisted = {
  theme: "light" | "dark";
  sidebarVisible: boolean;
  activeTool: Tool;
  canvasViewport: Record<string, TCanvasViewData>;
};

/**
 * Root store for the application
 * Auto loads from local
 * Auto fetch from backend on active canvas change
 */
const root = createRoot((dispose) => {
  const [activeCanvasId, setActiveCanvasId] = createSignal<string | null>(
    localStorage.getItem('vibecanvas-activeCanvasId') ?? null
  )

  createEffect(() => {
    const canvasId = activeCanvasId()
    if (canvasId !== null) {
      localStorage.setItem('vibecanvas-activeCanvasId', canvasId)
    } else {
      localStorage.removeItem('vibecanvas-activeCanvasId')
    }
  })

  // Load from localStorage
  let persisted: TPersisted;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    persisted = stored ? JSON.parse(stored) : {
      theme: "light",
      sidebarVisible: true,
      activeTool: 'select',
      canvasViewport: {},
    };
  } catch {
    persisted = {
      theme: "light",
      sidebarVisible: true,
      activeTool: 'select',
      canvasViewport: {},
    };
  }

  const [store, setStore] = createStore<TStore>({
    theme: persisted.theme,
    sidebarVisible: persisted.sidebarVisible,
    toolbarSlice: {
      activeTool: persisted.activeTool,
      isCollapsed: false,
    },
    canvasSlice: {
      selectedIds: [],
      mousePositionWorldSpace: { x: 0, y: 0 },
      canvasViewport: persisted.canvasViewport,
      get canvasViewportActive() {
        const canvasId = activeCanvasId()
        if (!canvasId) return null
        const viewport = this.canvasViewport[canvasId]
        if (viewport) return viewport
        // should exist, build it
        setStore('canvasSlice', 'canvasViewport', canvasId, { x: 0, y: 0, scale: 1 })
        return this.canvasViewport[canvasId]
      },
      backendCanvas: { } as {[canvasId: string]: TBackendCanvas},
      get backendCanvasActive() {
        const canvasId = activeCanvasId()
        if (!canvasId) return null

        return this.backendCanvas[canvasId] ?? null
      },
      canvas: null,
      docState: 'idle',
    },
    chatSlice: {
      backendChats: {} as {[canvasId: string]: TBackendChat[]},
      get backendChatsActive() {
        const canvasId = activeCanvasId()
        if (!canvasId) return []
        const chats = this.backendChats[canvasId]
        if (chats) return chats
        // should exist, build it
        setStore('chatSlice', 'backendChats', canvasId, [])
        return this.backendChats[canvasId]
      },

    },
    contextMenuSlice: defaultContextMenuSlice,
  });

  createEffect(() => {
    // keep this to sync with the persisted state
    store.canvasSlice.canvasViewportActive?.x
    const toPersist: TPersisted = {
      theme: store.theme,
      sidebarVisible: store.sidebarVisible,
      activeTool: store.toolbarSlice.activeTool,
      canvasViewport: unwrap(store.canvasSlice.canvasViewport),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
  });

  // Ensure viewport exists when canvas is activated
  createEffect(() => {
    const canvasId = activeCanvasId()
    if (!canvasId) return
    if (!store.canvasSlice.canvasViewport[canvasId]) {
      setStore('canvasSlice', 'canvasViewport', canvasId, { x: 0, y: 0, scale: 1 })
    }
  })

  // @ts-ignore
  window.store = store

  orpcWebsocketService.client.api.canvas.list()
  .then((canvases) => {
    const backendCanvas = canvases.reduce((acc, canvas) => {
      acc[canvas.id] = { ...canvas, created_at: new Date(canvas.created_at) }
      return acc
    }, {} as {[canvasId: string]: TBackendCanvas})
    setStore('canvasSlice', 'backendCanvas', backendCanvas)
    if (activeCanvasId() === null) {
      setActiveCanvasId(Object.keys(backendCanvas).at(-1) ?? null)
    }
  })
  .catch(() => {
    showErrorToast("Sync Error", "Failed to sync canvases from server")
  })

  createEffect((prev) => {
    const canvasId = activeCanvasId()
    if (!canvasId) return
    orpcWebsocketService.client.api.canvas.get({ params: { id: canvasId } })
    .then((response) => {
      setStore(
        'chatSlice',
        'backendChats',
        canvasId,
        response.chats.map(c => ({ ...c, created_at: new Date(c.created_at), updated_at: new Date(c.updated_at) }))
      )
    })
    .catch(() => {
      showErrorToast("Sync Error", "Failed to sync canvas from server")
    })
  })

  return {
    activeCanvasId,
    setActiveCanvasId,
    store,
    setStore,
    dispose,
  }
})

export const activeCanvasId = root.activeCanvasId
export const setActiveCanvasId = root.setActiveCanvasId
export const store = root.store
export const setStore = root.setStore
export const disposeStore = root.dispose
