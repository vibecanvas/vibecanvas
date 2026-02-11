import type { Component } from "solid-js";
import { createSignal } from "solid-js";
import { Dialog } from "@kobalte/core/dialog";
import { Button } from "@kobalte/core/button";

export type CreateCanvasDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCanvasCreated: (title: string) => void;
};

export const CreateCanvasDialog: Component<CreateCanvasDialogProps> = (props) => {
  const [title, setTitle] = createSignal("");

  const handleCreate = () => {
    const finalTitle = title().trim() || "Untitled Canvas";
    props.onCanvasCreated(finalTitle);
    setTitle("");
    props.onOpenChange(false);
  };

  const isValid = () => title().trim().length > 0;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-popover text-popover-foreground border border-border shadow-md p-6 z-50 w-120 max-w-[90vw]">
          <Dialog.Title class="font-display text-base text-foreground mb-1">
            Create Your Canvas
          </Dialog.Title>
          <Dialog.Description class="text-xs text-muted-foreground mb-4">
            Give your canvas a title.
          </Dialog.Description>

          <div class="mb-6">
            <label
              for="canvas-title"
              class="block text-xs font-medium text-foreground mb-1.5"
            >
              Canvas Title
            </label>
            <input
              id="canvas-title"
              type="text"
              placeholder="Untitled Canvas"
              value={title()}
              onInput={(e) => setTitle(e.currentTarget.value)}
              class="w-full px-3 py-2 text-sm bg-background border border-input text-foreground outline-none focus:ring-2 focus:ring-ring transition-colors placeholder:text-muted-foreground"
              autofocus
            />
          </div>

          <div class="flex justify-end">
            <Button
              class="px-4 py-2 text-xs font-medium bg-primary text-primary-foreground hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCreate}
              disabled={!isValid()}
            >
              Create Canvas
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};

export default CreateCanvasDialog;
