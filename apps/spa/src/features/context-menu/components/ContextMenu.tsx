import { Portal } from 'solid-js/web';
import { Show, For, createEffect, onCleanup, createMemo } from 'solid-js';
import { store } from '@/store';
import { closeContextMenu, getContextMenuItems } from '../store/context-menu.actions';
import type { ContextMenuItem } from '../types';

export function ContextMenu() {
  const isOpen = () => store.contextMenuSlice.isOpen;
  const position = () => store.contextMenuSlice.position;
  const targetIds = () => store.contextMenuSlice.targetIds;
  const items = createMemo(() => getContextMenuItems());

  const adjustedPosition = createMemo(() => {
    const { x, y } = position();
    const menuWidth = 180;
    const menuHeight = 200;

    return {
      x: Math.min(x, window.innerWidth - menuWidth - 8),
      y: Math.min(y, window.innerHeight - menuHeight - 8),
    };
  });

  createEffect(() => {
    if (!isOpen()) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-context-menu]')) {
        closeContextMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);

    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    });
  });

  const handleItemClick = (item: ContextMenuItem) => {
    const disabled = typeof item.disabled === 'function'
      ? item.disabled(targetIds())
      : item.disabled;
    if (disabled) return;

    item.onClick(targetIds());
    closeContextMenu();
  };

  const isDisabled = (item: ContextMenuItem): boolean => {
    if (typeof item.disabled === 'function') {
      return item.disabled(targetIds());
    }
    return item.disabled ?? false;
  };

  return (
    <Portal>
      <Show when={isOpen()}>
        <div
          data-context-menu
          class="fixed z-[9999] min-w-[180px] bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-md py-1 font-mono text-sm"
          style={{
            left: `${adjustedPosition().x}px`,
            top: `${adjustedPosition().y}px`,
          }}
        >
          <Show
            when={items().length > 0}
            fallback={
              <div class="px-3 py-2 text-[var(--text-muted)] text-xs">
                No actions available
              </div>
            }
          >
            <For each={items()}>
              {(item) => (
                <>
                  <button
                    type="button"
                    class="w-full px-3 py-1.5 flex items-center justify-between gap-4 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isDisabled(item)}
                    onClick={() => handleItemClick(item)}
                  >
                    <span class="flex items-center gap-2">
                      <Show when={item.icon}>
                        <span class="w-4 h-4 flex items-center justify-center">
                          {item.icon!()}
                        </span>
                      </Show>
                      <span>{item.label}</span>
                    </span>
                    <Show when={item.shortcut}>
                      <span class="text-xs text-[var(--text-muted)]">
                        {item.shortcut}
                      </span>
                    </Show>
                  </button>
                  <Show when={item.separator}>
                    <div class="h-px bg-[var(--border-default)] my-1" />
                  </Show>
                </>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </Portal>
  );
}
