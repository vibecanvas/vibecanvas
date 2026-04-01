import { Button } from "@kobalte/core/button";
import { Dialog } from "@kobalte/core/dialog";
import ArrowUp from "lucide-solid/icons/arrow-up";
import ChevronRight from "lucide-solid/icons/chevron-right";
import Folder from "lucide-solid/icons/folder";
import House from "lucide-solid/icons/house";
import { For, Show, createEffect, createSignal } from "solid-js";
import type { TFiletreeSafeClient } from "../../services/canvas/interface";

type TDirChild = {
  name: string;
  path: string;
};

type TPathPickerDialogProps = {
  safeClient: TFiletreeSafeClient;
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
  const [pathInput, setPathInput] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  const loadDirectory = async (path: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    const [listError, listResult] = await props.safeClient.api.filesystem.list({
      query: { path, omitFiles: true },
    });

    setIsLoading(false);

    if (listError || !listResult || "type" in listResult) {
      setErrorMessage(listError && "message" in (listError as object) ? (listError as { message?: string }).message ?? "Failed to load folders" : (listResult && "message" in listResult ? listResult.message : "Failed to load folders"));
      return false;
    }

    setCurrentPath(listResult.current);
    setPathInput(listResult.current);
    setParentPath(listResult.parent);
    setChildren(listResult.children.filter((child) => child.isDir));
    return true;
  };

  const loadHomeDirectory = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const [homeError, homeResult] = await props.safeClient.api.filesystem.home();
    if (homeError || !homeResult || "type" in homeResult) {
      setIsLoading(false);
      setErrorMessage(homeError && "message" in (homeError as object) ? (homeError as { message?: string }).message ?? "Failed to load home folder" : (homeResult && "message" in homeResult ? homeResult.message : "Failed to load home folder"));
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
        <Dialog.Overlay class="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          class="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[min(720px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col border border-border bg-popover p-5 text-popover-foreground shadow-md"
          onWheel={(event: WheelEvent) => {
            event.stopPropagation();
            if (event.ctrlKey) event.preventDefault();
          }}
          style={{ "overscroll-behavior": "contain" }}
        >
          <Dialog.Title class="mb-1 font-display text-base text-foreground">{props.title}</Dialog.Title>
          <Show when={props.description}>
            <Dialog.Description class="mb-3 border border-border bg-secondary px-2 py-1.5 text-xs text-muted-foreground">
              {props.description}
            </Dialog.Description>
          </Show>

          <div class="mb-2 flex items-center gap-2">
            <Button
              class="border border-border bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:bg-accent disabled:opacity-50"
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
              class="border border-border bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:bg-accent disabled:opacity-50"
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

          <div class="mb-2 flex items-center gap-2">
            <input
              class="h-8 flex-1 border border-border bg-background px-2 text-xs"
              value={pathInput()}
              onInput={(event) => setPathInput(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                const nextPath = pathInput().trim();
                if (!nextPath) return;
                void loadDirectory(nextPath);
              }}
              placeholder="Paste full path"
            />
            <Button
              class="h-8 border border-border bg-secondary px-2 text-xs text-secondary-foreground hover:bg-accent disabled:opacity-50"
              disabled={isLoading() || !pathInput().trim()}
              onClick={() => {
                const nextPath = pathInput().trim();
                if (!nextPath) return;
                void loadDirectory(nextPath);
              }}
            >
              Go
            </Button>
          </div>

          <div class="min-h-0 flex-1 overflow-auto border border-border bg-background">
            <div class="p-1">
              <Show when={!isLoading()} fallback={<div class="p-3 text-xs text-muted-foreground">Loading folders...</div>}>
                <Show when={!errorMessage()} fallback={<div class="p-3 text-xs text-destructive">{errorMessage()}</div>}>
                  <Show when={children().length > 0} fallback={<div class="p-3 text-xs text-muted-foreground">No subfolders</div>}>
                    <For each={children()}>
                      {(child) => (
                        <button
                          type="button"
                          class="mb-1 flex w-full items-center justify-between border border-border px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent last:mb-0"
                          onClick={() => void loadDirectory(child.path)}
                        >
                          <div class="flex min-w-0 items-center gap-1">
                            <Folder size={12} class="shrink-0" />
                            <span class="truncate">{child.name}</span>
                          </div>
                          <ChevronRight size={12} class="shrink-0 text-muted-foreground" />
                        </button>
                      )}
                    </For>
                  </Show>
                </Show>
              </Show>
            </div>
          </div>

          <div class="mt-3 flex justify-end gap-2">
            <Button
              class="border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-accent"
              onClick={() => props.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              class="bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/85 disabled:opacity-50"
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
