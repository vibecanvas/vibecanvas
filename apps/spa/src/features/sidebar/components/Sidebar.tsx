import { createDocument } from "@/services/automerge";
import { Button } from "@kobalte/core/button";
import Plus from "lucide-solid/icons/plus";
import Settings from "lucide-solid/icons/settings";
import type { Component } from "solid-js";
import { For, createSignal } from "solid-js";
import { activeCanvasId, setActiveCanvasId, store } from "../../../store";
import type { TBackendCanvas } from "../../../types/backend.types";
import { deleteCanvas, updateCanvas } from "../../canvas-crdt/store/canvas.actions";
import { CreateCanvasDialog } from "./CreateCanvasDialog";
import { DeleteCanvasDialog } from "./DeleteCanvasDialog";
import { RenameDialog } from "./RenameDialog";
import SidebarItem from "./SidebarItem";

export type SidebarProps = {
  visible?: boolean;
  onSettingsClick?: () => void;
};

const Sidebar: Component<SidebarProps> = (props) => {
  const canvases = () => Object.values(store.canvasSlice.backendCanvas);

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = createSignal(false);
  const [canvasToRename, setCanvasToRename] = createSignal<{
    id: string;
    name: string;
  } | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = createSignal(false);
  const [canvasToDelete, setCanvasToDelete] = createSignal<TBackendCanvas | null>(null);

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = createSignal(false);

  const handleOpenRenameDialog = (canvasId: string, canvasName: string) => {
    setCanvasToRename({ id: canvasId, name: canvasName });
    setRenameDialogOpen(true);
  };

  const handleOpenDeleteDialog = (canvas: TBackendCanvas) => {
    setCanvasToDelete(canvas);
    setDeleteDialogOpen(true);
  };

  const handleRename = async (newName: string) => {
    const canvas = canvasToRename();
    if (canvas) {
      await updateCanvas(canvas.id, { name: newName });
    }
  };

  const handleDelete = async () => {
    const canvas = canvasToDelete();
    if (canvas) {
      await deleteCanvas(canvas.id);
    }
  };

  const handleCreateCanvas = async (title: string) => {
    await createDocument({ name: title });
  };

  return (
    <>
      <aside
        class="h-screen bg-card border-r border-border flex flex-col overflow-hidden transition-[width] duration-200"
        classList={{ "w-64": props.visible !== false, "w-0 border-r-0": props.visible === false }}
      >
        {/* Header */}
        <div class="px-3 py-3 border-b border-border">
          <h1 class="font-display text-sm tracking-[0.25em] text-foreground">
            VIBECANVAS
          </h1>
        </div>

        {/* Canvas List */}
        <div class="flex-1 overflow-y-auto">
          <For each={canvases().filter(canvas => !!canvas)}>
            {(canvas) => (
              <SidebarItem
                name={canvas.name}
                selected={activeCanvasId() === canvas.id}
                onClick={() => setActiveCanvasId(canvas.id)}
                onRename={() => handleOpenRenameDialog(canvas.id, canvas.name)}
                onDelete={() => handleOpenDeleteDialog(canvas)}
              />
            )}
          </For>

          {/* New Canvas Button */}
          <Button
            class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus size={14} class="text-muted-foreground" />
            <span class="font-medium text-xs text-foreground">New Canvas</span>
          </Button>
        </div>

        {/* Settings Footer */}
        <div class="border-t border-border">
          <Button
            class="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
            onClick={() => props.onSettingsClick?.()}
          >
            <Settings size={14} class="text-muted-foreground" />
            <span class="font-medium text-xs text-foreground">Settings</span>
          </Button>
        </div>
      </aside>

      {/* Rename Dialog */}
      <RenameDialog
        open={renameDialogOpen()}
        onOpenChange={setRenameDialogOpen}
        currentName={canvasToRename()?.name ?? ""}
        onRename={handleRename}
      />

      {/* Delete Dialog */}
      <DeleteCanvasDialog
        open={deleteDialogOpen()}
        onOpenChange={setDeleteDialogOpen}
        canvas={canvasToDelete()}
        onDelete={handleDelete}
      />

      {/* Create Canvas Dialog */}
      <CreateCanvasDialog
        open={createDialogOpen()}
        onOpenChange={setCreateDialogOpen}
        onCanvasCreated={handleCreateCanvas}
      />
    </>
  );
};

export default Sidebar;
