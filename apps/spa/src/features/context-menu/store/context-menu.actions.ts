import { setStore, store } from '@/store';
import type { ContextMenuType, ContextMenuPosition, ContextMenuItem } from '../types';

export function openContextMenu(
  position: ContextMenuPosition,
  context: ContextMenuType,
  targetIds: string[] = []
): void {
  setStore('contextMenuSlice', {
    isOpen: true,
    position,
    context,
    targetIds,
  });
}

export function closeContextMenu(): void {
  setStore('contextMenuSlice', 'isOpen', false);
}

export function registerContextMenuItem(
  context: ContextMenuType,
  item: ContextMenuItem
): void {
  const existing = store.contextMenuSlice.registry[context];
  if (existing.some(i => i.id === item.id)) return;
  setStore('contextMenuSlice', 'registry', context, [...existing, item]);
}

export function unregisterContextMenuItem(
  context: ContextMenuType,
  itemId: string
): void {
  const existing = store.contextMenuSlice.registry[context];
  setStore('contextMenuSlice', 'registry', context, existing.filter(i => i.id !== itemId));
}

export function registerContextMenuItems(
  context: ContextMenuType,
  items: ContextMenuItem[]
): void {
  items.forEach(item => registerContextMenuItem(context, item));
}

export function getContextMenuItems(): ContextMenuItem[] {
  const { context, registry } = store.contextMenuSlice;
  return registry[context];
}
