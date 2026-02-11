import type { TBackendChat } from '@/types/backend.types'

// === State Interface ===
export type TChatSlice = {
  chatSlice: {
    backendChats: { [canvasId: string]: TBackendChat[] }
    backendChatsActive: TBackendChat[]
  }
}
