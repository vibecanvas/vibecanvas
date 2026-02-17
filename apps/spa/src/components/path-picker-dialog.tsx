import { Button } from "@kobalte/core/button";
import { Dialog } from "@kobalte/core/dialog";
import { orpcWebsocketService } from "@/services/orpc-websocket";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChevronRight from "lucide-solid/icons/chevron-right";
import Folder from "lucide-solid/icons/folder";
import FolderOpen from "lucide-solid/icons/folder-open";
import House from "lucide-solid/icons/house";
import ArrowUp from "lucide-solid/icons/arrow-up";
import { For, Show, createEffect, createSignal } from "solid-js";

type TDirChild = {
  name: string;
  path: string;
};

type TPathPickerDialogProps = {
  open: boolean;
  initialPath: string | null;
  onOpenChange: (open: boolean) => void;
  onPathSelected: (path: string) => void | Promise<void>;
  title: string;
  description?: string;
};

export function PathPickerDialog(props: TPathPickerDialogProps) {
  const [currentPath, setCurrentPath] = createSignal("");
  const [parentPath, setParentPath] = createSignal<string | null>(null);
  const [children, setChildren] = createSignal<TDirChild[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  const loadDirectory = async (path: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    const [listError, listResult] = await orpcWebsocketService.safeClient.api.file.list({
      query: { path, omitFiles: true },
    });

    setIsLoading(false);

    if (listError || !listResult || "type" in listResult) {
      setErrorMessage(listError?.message ?? (listResult && "message" in listResult ? listResult.message : "Failed to load folders"));
      return false;
    }

    setCurrentPath(listResult.current);
    setParentPath(listResult.parent);
    setChildren(listResult.children);
    return true;
  };

  const loadHomeDirectory = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const [homeError, homeResult] = await orpcWebsocketService.safeClient.api.file.home();

    if (homeError || !homeResult || "type" in homeResult) {
      setIsLoading(false);
      setErrorMessage(homeError?.message ?? (homeResult && "message" in homeResult ? homeResult.message : "Failed to load home folder"));
      return;
    }

    setIsLoading(false);
    await loadDirectory(homeResult.path);
  };

  createEffect(() => {
    if (!props.open) return;

    const initialPath = props.initialPath?.trim();
    if (initialPath) {
      void loadDirectory(initialPath).then((ok) => {
        if (!ok) void loadHomeDirectory();
      });
      return;
    }

    void loadHomeDirectory();
  });

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content
          class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-popover text-popover-foreground border border-border shadow-md z-50 w-xl max-w-[92vw] max-h-[70vh] p-5 flex flex-col"
          onWheel={(e: WheelEvent) => e.stopPropagation()}
          style={{ "overscroll-behavior": "contain" }}
        >
          <Dialog.Title class="font-display text-base text-foreground mb-1 shrink-0">{props.title}</Dialog.Title>
          <Show when={props.description}>
            <Dialog.Description class="text-xs text-muted-foreground bg-secondary border border-border px-2 py-1.5 mb-3 shrink-0">
              {props.description}
            </Dialog.Description>
          </Show>

          <div class="flex items-center gap-2 mb-2 shrink-0">
            <Button
              class="px-2 py-1 text-xs bg-secondary text-secondary-foreground border border-border hover:bg-accent disabled:opacity-50"
              disabled={isLoading()}
              onClick={() => void loadHomeDirectory()}
              title="Go to home"
            >
              <div class="flex items-center gap-1">
                <House size={12} />
                Home
              </div>
            </Button>
            <Button
              class="px-2 py-1 text-xs bg-secondary text-secondary-foreground border border-border hover:bg-accent disabled:opacity-50"
              disabled={isLoading() || !parentPath()}
              onClick={() => {
                const parent = parentPath();
                if (parent) void loadDirectory(parent);
              }}
              title="Go up"
            >
              <div class="flex items-center gap-1">
                <ArrowUp size={12} />
                Up
              </div>
            </Button>
          </div>

          <div class="mb-2 px-2 py-1.5 border border-border bg-background text-xs text-muted-foreground truncate flex items-center gap-1 shrink-0">
            <FolderOpen size={12} />
            <span class="truncate">{currentPath() || "Loading..."}</span>
          </div>

          <ScrollArea class="flex-1 min-h-0 border border-border bg-background" viewportClass="h-full">
            <div class="p-1">
              <Show when={!isLoading()} fallback={<div class="p-3 text-xs text-muted-foreground">Loading folders...</div>}>
                <Show when={!errorMessage()} fallback={<div class="p-3 text-xs text-destructive">{errorMessage()}</div>}>
                  <Show when={children().length > 0} fallback={<div class="p-3 text-xs text-muted-foreground">No subfolders</div>}>
                    <For each={children()}>
                      {(child) => (
                        <button
                          type="button"
                          class="w-full text-left px-2 py-1.5 border border-border mb-1 last:mb-0 hover:bg-accent text-foreground text-xs flex items-center justify-between"
                          onClick={() => void loadDirectory(child.path)}
                        >
                          <div class="flex items-center gap-1 min-w-0">
                            <Folder size={12} class="shrink-0" />
                            <span class="truncate">{child.name}</span>
                          </div>
                          <ChevronRight size={12} class="text-muted-foreground shrink-0" />
                        </button>
                      )}
                    </For>
                  </Show>
                </Show>
              </Show>
            </div>
          </ScrollArea>

          <div class="flex justify-end gap-2 mt-3 shrink-0">
            <Button
              class="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground border border-border hover:bg-accent"
              onClick={() => props.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              class="px-3 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-amber-600 disabled:opacity-50"
              disabled={isLoading() || !currentPath()}
              onClick={() => void props.onPathSelected(currentPath())}
            >
              Use This Folder
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
