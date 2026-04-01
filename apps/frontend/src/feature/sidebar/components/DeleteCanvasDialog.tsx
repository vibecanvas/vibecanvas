import type { Component } from "solid-js";
import { Dialog } from "@kobalte/core/dialog";
import { Button } from "@kobalte/core/button";
import type { TBackendCanvas } from "../../../types/backend.types";

export type DeleteCanvasDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvas: TBackendCanvas | null;
  onDelete: () => void;
};

export const DeleteCanvasDialog: Component<DeleteCanvasDialogProps> = (props) => {
  const handleDelete = () => {
    props.onDelete();
    props.onOpenChange(false);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-popover text-popover-foreground border border-border shadow-md p-6 z-50 w-100 max-w-[90vw]">
          <Dialog.Title class="font-display text-base text-foreground mb-1">
            Delete Canvas
          </Dialog.Title>
          <Dialog.Description class="text-xs text-muted-foreground mb-6">
            Are you sure you want to delete "{props.canvas?.name}"? This action cannot be undone.
          </Dialog.Description>

          <div class="flex justify-end gap-2">
            <Button
              class="px-4 py-2 text-xs font-medium bg-secondary text-secondary-foreground border border-border hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
              onClick={() => props.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              class="px-4 py-2 text-xs font-medium bg-destructive text-destructive-foreground hover:bg-red-700 transition-colors"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};

export default DeleteCanvasDialog;
