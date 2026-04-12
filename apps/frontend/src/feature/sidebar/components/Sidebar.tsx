import { Button } from "@kobalte/core/button";
import * as ToggleButton from "@kobalte/core/toggle-button";
import { useLocation, useNavigate } from "@solidjs/router";
import MoonStar from "lucide-solid/icons/moon-star";
import Plus from "lucide-solid/icons/plus";
import Sun from "lucide-solid/icons/sun";
import type { Component } from "solid-js";
import { For, createSignal } from "solid-js";
import { orpcWebsocketService } from "../../../services/orpc-websocket";
import type { TBackendCanvas } from "../../../types/backend.types";
import { CreateCanvasDialog } from "./CreateCanvasDialog";
import { DeleteCanvasDialog } from "./DeleteCanvasDialog";
import { RenameDialog } from "./RenameDialog";
import SidebarItem from "./SidebarItem";
import { showErrorToast } from "@/components/ui/Toast";
import { removeFromCache } from "@/services/automerge";
import { themeService, txSetThemeAppearance } from "@/services/theme";
import { store, setStore } from "@/store";

export type SidebarProps = {
  visible?: boolean;
  onSettingsClick?: () => void;
};
const Sidebar: Component<SidebarProps> = (props) => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeCanvasId = () => {
    const match = location.pathname.match(/^\/c\/(.+)/);
    return match ? match[1] : null;
  };

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
      const [err, data] = await orpcWebsocketService.apiService.api.canvas.update({ params: { id: canvas.id }, body: { name: newName } })
      if (err) showErrorToast(err.message)
      if (data) {
        setStore("canvases", c => c.id === canvas.id, data)
      }
    }
  };

  const handleDelete = async () => {
    const canvas = canvasToDelete();
    if (canvas) {
      const isActive = activeCanvasId() === canvas.id;
      const [err, data] = await orpcWebsocketService.apiService.api.canvas.remove({ params: { id: canvas.id } })
      if (err) showErrorToast(err.message)
      if (data) {
        removeFromCache(data.automerge_url)
        setStore("canvases", prev => prev.filter(c => c.id !== data.id))
        if (isActive) navigate("/");
      }
    }
  };

  const handleCreateCanvas = async (title: string) => {
    const [err, data] = await orpcWebsocketService.apiService.api.canvas.create({ name: title })
    if (err) showErrorToast(err.message)
    if (data) {
      setStore("canvases", prev => [...prev, data])
      navigate(`/c/${data.id}`)
    }
  };

  const isDarkTheme = () => {
    void store.theme;
    return themeService.getTheme().appearance === "dark";
  };

  const handleThemeToggle = (pressed: boolean) => {
    txSetThemeAppearance(pressed ? "dark" : "light");
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
          <For each={store.canvases}>
            {(canvas) => (
              <SidebarItem
                name={canvas.name}
                selected={activeCanvasId() === canvas.id}
                onClick={() => navigate(`/c/${canvas.id}`)}
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

        <div class="border-t border-border p-3">
          <ToggleButton.Root
            pressed={isDarkTheme()}
            onChange={handleThemeToggle}
            class="w-full flex items-center justify-between gap-2 border border-border bg-secondary px-3 py-2 text-xs text-secondary-foreground hover:bg-accent transition-colors data-[pressed]:bg-primary/15 data-[pressed]:text-foreground"
            aria-label="Toggle dark theme"
          >
            <div class="flex items-center gap-2">
              {isDarkTheme() ? <MoonStar size={14} class="text-primary" /> : <Sun size={14} class="text-warning" />}
              <span class="font-medium">Dark mode</span>
            </div>
            <span class="font-mono text-[10px] text-muted-foreground">
              {isDarkTheme() ? "ON" : "OFF"}
            </span>
          </ToggleButton.Root>
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
