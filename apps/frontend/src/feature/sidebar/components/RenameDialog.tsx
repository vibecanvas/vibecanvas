import type { Component } from "solid-js";
import { createSignal, createEffect } from "solid-js";
import { Dialog } from "@kobalte/core/dialog";
import { Button } from "@kobalte/core/button";

export type RenameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  onRename: (newName: string) => void;
};

export const RenameDialog: Component<RenameDialogProps> = (props) => {
  const [name, setName] = createSignal(props.currentName);

  // Reset name when dialog opens with new currentName
  createEffect(() => {
    if (props.open) {
      setName(props.currentName);
    }
  });

  const handleRename = () => {
    const trimmedName = name().trim();
    if (trimmedName && trimmedName !== props.currentName) {
      props.onRename(trimmedName);
    }
    props.onOpenChange(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRename();
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-popover text-popover-foreground border border-border shadow-md p-6 z-50 w-100 max-w-[90vw]">
          <Dialog.Title class="font-display text-base text-foreground mb-1">
            Rename Canvas
          </Dialog.Title>
          <Dialog.Description class="text-xs text-muted-foreground mb-4">
            Enter a new name for this canvas.
          </Dialog.Description>

          <div class="mb-6">
            <label
              for="canvas-name"
              class="block text-xs font-medium text-foreground mb-1.5"
            >
              Canvas Name
            </label>
            <input
              id="canvas-name"
              type="text"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              class="w-full px-3 py-2 text-sm bg-background border border-input text-foreground outline-none focus:ring-2 focus:ring-ring transition-colors"
              autofocus
            />
          </div>

          <div class="flex justify-end gap-2">
            <Button
              class="px-4 py-2 text-xs font-medium bg-secondary text-secondary-foreground border border-border hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
              onClick={() => props.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              class="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground hover:bg-amber-600 transition-colors"
              onClick={handleRename}
            >
              Rename
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};

export default RenameDialog;
