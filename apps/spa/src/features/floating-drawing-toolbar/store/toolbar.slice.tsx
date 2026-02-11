/**
 * Toolbar Slice
 * State slice for the floating drawing toolbar
 */

import type { Tool } from '../types/toolbar.types'

export interface TToolbarSlice {
  toolbarSlice: {
    activeTool: Tool
    isCollapsed: boolean
  }
}

export const createToolbarSlice = (): TToolbarSlice => ({
  toolbarSlice: {
    activeTool: 'select',
    isCollapsed: false,
  }
})
