import type { TOrpcSafeClient } from "@vibecanvas/orpc-client";
import "./styles.css";
import { Button } from "@kobalte/core/button";
import { Dialog } from "@kobalte/core/dialog";
import ArrowUp from "lucide-solid/icons/arrow-up";
import ChevronRight from "lucide-solid/icons/chevron-right";
import Folder from "lucide-solid/icons/folder";
import House from "lucide-solid/icons/house";
import { For, Show, createEffect, createSignal } from "solid-js";

type TDirChild = {
  name: string;
  path: string;
};

type TPathPickerDialogProps = {
  apiService: TOrpcSafeClient;
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

    const [listError, listResult] = await props.apiService.api.filesystem.list({
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

    const [homeError, homeResult] = await props.apiService.api.filesystem.home();
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
        <Dialog.Overlay class="vc-path-dialog-overlay" />
        <Dialog.Content
          class="vc-path-dialog"
          onWheel={(event: WheelEvent) => {
            event.stopPropagation();
            if (event.ctrlKey) event.preventDefault();
          }}
          style={{ "overscroll-behavior": "contain" }}
        >
          <Dialog.Title class="vc-path-dialog-title">{props.title}</Dialog.Title>
          <Show when={props.description}>
            <Dialog.Description class="vc-path-dialog-description">
              {props.description}
            </Dialog.Description>
          </Show>

          <div class="vc-path-dialog-row">
            <Button
              class="vc-path-dialog-action"
              disabled={isLoading()}
              onClick={() => void loadHomeDirectory()}
              title="Go to home"
            >
              <div class="vc-filetree-toolbar-row">
                <House size={12} />
                Home
              </div>
            </Button>
            <Button
              class="vc-path-dialog-action"
              disabled={isLoading() || !parentPath()}
              onClick={() => {
                const parent = parentPath();
                if (parent) void loadDirectory(parent);
              }}
              title="Go up"
            >
              <div class="vc-filetree-toolbar-row">
                <ArrowUp size={12} />
                Up
              </div>
            </Button>
          </div>

          <div class="vc-path-dialog-row">
            <input
              class="vc-path-dialog-input"
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
              class="vc-path-dialog-action"
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

          <div class="vc-path-dialog-list">
            <div class="vc-path-dialog-list-inner">
              <Show when={!isLoading()} fallback={<div class="vc-path-dialog-state">Loading folders...</div>}>
                <Show when={!errorMessage()} fallback={<div class="vc-path-dialog-state vc-path-dialog-state--error">{errorMessage()}</div>}>
                  <Show when={children().length > 0} fallback={<div class="vc-path-dialog-state">No subfolders</div>}>
                    <For each={children()}>
                      {(child) => (
                        <button
                          type="button"
                          class="vc-path-dialog-folder-row"
                          onClick={() => void loadDirectory(child.path)}
                        >
                          <div class="vc-path-dialog-folder-row-main">
                            <Folder size={12} class="vc-path-dialog-folder-icon" />
                            <span class="vc-path-dialog-folder-name">{child.name}</span>
                          </div>
                          <ChevronRight size={12} class="vc-path-dialog-folder-caret" />
                        </button>
                      )}
                    </For>
                  </Show>
                </Show>
              </Show>
            </div>
          </div>

          <div class="vc-path-dialog-footer">
            <Button
              class="vc-path-dialog-action"
              onClick={() => props.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              class="vc-path-dialog-confirm"
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
