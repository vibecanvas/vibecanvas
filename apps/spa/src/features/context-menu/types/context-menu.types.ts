import type { JSX } from 'solid-js';

export type ContextMenuType = 'canvas' | 'shape' | 'selection';

export type ContextMenuPosition = {
  x: number;
  y: number;
};

export type ContextMenuItem = {
  id: string;
  label: string;
  icon?: () => JSX.Element;
  shortcut?: string;
  disabled?: boolean | ((targetIds: string[]) => boolean);
  onClick: (targetIds: string[]) => void;
  separator?: boolean;
};

export type ContextMenuRegistry = {
  canvas: ContextMenuItem[];
  shape: ContextMenuItem[];
  selection: ContextMenuItem[];
};

export type ContextMenuState = {
  isOpen: boolean;
  position: ContextMenuPosition;
  context: ContextMenuType;
  targetIds: string[];
  registry: ContextMenuRegistry;
};
