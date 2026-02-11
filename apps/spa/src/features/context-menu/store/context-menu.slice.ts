import type { ContextMenuState } from '../types';

export interface TContextMenuSlice {
  contextMenuSlice: ContextMenuState;
}

export const defaultContextMenuSlice: ContextMenuState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  context: 'canvas',
  targetIds: [],
  registry: {
    canvas: [],
    shape: [],
    selection: [],
  },
};
