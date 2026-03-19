import { Dialog } from "@kobalte/core/dialog";
import { For, Show } from "solid-js";
import { HELP_CALLOUT, HELP_SECTIONS } from "./help.data";

type ICanvasHelpProps = {
  open: () => boolean;
  onOpenChange: (open: boolean) => void;
};

function ShortcutKeys(props: { keys: string[] }) {
  return (
    <div class="flex flex-wrap items-center justify-end gap-1.5">
      <For each={props.keys}>
        {(key) => (
          <kbd class="min-w-7 border border-border bg-secondary px-2 py-1 text-[10px] font-mono text-foreground">
            {key}
          </kbd>
        )}
      </For>
    </div>
  );
}

export function CanvasHelp(props: ICanvasHelpProps) {
  return (
    <Dialog open={props.open()} onOpenChange={props.onOpenChange}>
      <Dialog.Trigger
        type="button"
        class="pointer-events-auto flex h-11 w-11 items-center justify-center border border-border bg-card text-foreground shadow-md transition-colors hover:bg-stone-200 dark:hover:bg-stone-800"
        aria-label="Open canvas help"
        title="Help (?)"
      >
        <span class="font-display text-lg leading-none">?</span>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content class="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(960px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden border border-border bg-popover text-popover-foreground shadow-md">
          <div class="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <Dialog.Title class="font-display text-2xl text-foreground">Help</Dialog.Title>
              <Dialog.Description class="mt-1 max-w-2xl text-xs text-muted-foreground">
                {HELP_CALLOUT}
              </Dialog.Description>
            </div>

            <Dialog.CloseButton
              class="flex h-9 w-9 items-center justify-center border border-border bg-card text-muted-foreground transition-colors hover:bg-stone-200 hover:text-foreground dark:hover:bg-stone-800"
              aria-label="Close help"
            >
              <span class="text-sm leading-none">x</span>
            </Dialog.CloseButton>
          </div>

          <div class="grid max-h-[calc(85vh-96px)] gap-4 overflow-y-auto p-5 md:grid-cols-2 xl:grid-cols-3">
            <For each={HELP_SECTIONS}>
              {(section) => (
                <section class="border border-border bg-card">
                  <div class="border-b border-border px-4 py-3">
                    <h2 class="font-display text-lg text-foreground">{section.title}</h2>
                  </div>

                  <div>
                    <For each={section.items}>
                      {(item) => (
                        <div class="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                          <div>
                            <div class="text-sm text-foreground">{item.label}</div>
                            <Show when={item.note}>
                              <div class="mt-1 text-[11px] text-muted-foreground">{item.note}</div>
                            </Show>
                          </div>

                          <Show when={item.keys && item.keys.length}>
                            <ShortcutKeys keys={item.keys!} />
                          </Show>
                        </div>
                      )}
                    </For>
                  </div>
                </section>
              )}
            </For>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
