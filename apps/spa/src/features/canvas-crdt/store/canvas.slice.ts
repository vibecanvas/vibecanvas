import type { TBackendCanvas } from '@/types/backend.types'
import type { Canvas } from '../canvas/canvas'

// === Types ===
export type TCanvasViewData = {
  x: number
  y: number
  scale: number
}

export type TDocState =
  | 'idle'
  | 'awaiting-network'
  | 'loading'
  | 'requesting'
  | 'ready'
  | 'unavailable'
  | 'deleted'

// === Store Interface used in store.ts ===

export interface TCanvasSlice {
  canvasSlice: {
    canvasViewport: { [canvasId: string]: TCanvasViewData | undefined }

    backendCanvas: { [canvasId: string]: TBackendCanvas | undefined }
    backendCanvasActive: TBackendCanvas | null

    selectedIds: string[]  // Can contain element IDs or group IDs (all unique)
    mousePositionWorldSpace: { x: number, y: number }

    canvas: Canvas | null
    docState: TDocState
  }
}