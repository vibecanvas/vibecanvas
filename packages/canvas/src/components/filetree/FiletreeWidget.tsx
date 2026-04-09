import { createEffect, createMemo, onCleanup, type Accessor } from "solid-js";
import ArrowUp from "lucide-solid/icons/arrow-up";
import ChevronDown from "lucide-solid/icons/chevron-down";
import ChevronRight from "lucide-solid/icons/chevron-right";
import FileIcon from "lucide-solid/icons/file";
import Folder from "lucide-solid/icons/folder";
import FolderOpen from "lucide-solid/icons/folder-open";
import FolderSearch from "lucide-solid/icons/folder-search";
import House from "lucide-solid/icons/house";
import RefreshCw from "lucide-solid/icons/refresh-cw";
import { For, Show } from "solid-js";
import type { THostedWidgetElementMap, TFiletreeNode, TFiletreeSafeClient, THostedWidgetChrome } from "../../services/canvas/interface";
import { PathPickerDialog } from "./PathPickerDialog";
import { createFiletreeContextLogic } from "./createFiletreeContextLogic";
import { toTildePath } from "./path-display";

type TFiletreeWidgetProps = {
  element: Accessor<THostedWidgetElementMap["filetree"]>;
  safeClient: TFiletreeSafeClient;
  setWindowChrome?: (chrome: THostedWidgetChrome | null) => void;
  onPathChange: (path: string) => void;
};

export function FiletreeWidget(props: TFiletreeWidgetProps) {
  const filetreeLogic = createFiletreeContextLogic({
    element: props.element,
    safeClient: props.safeClient,
    onPathChange: props.onPathChange,
  });
  const windowTitle = createMemo(() => {
    const path = filetreeLogic.currentPath();
    if (path) {
      return toTildePath(path, filetreeLogic.homePath());
    }

    return "files";
  });

  createEffect(() => {
    props.setWindowChrome?.({ title: windowTitle() });
  });

  onCleanup(() => {
    props.setWindowChrome?.(null);
  });

  const renderTree = (node: TFiletreeNode, depth: number, parentPath: string) => {
    const isOpen = () => filetreeLogic.openFolders().has(node.path);
    const isSelected = () => filetreeLogic.selectedRowPath() === node.path;
    const isDropTarget = () => filetreeLogic.dragOverTargetPath() === node.path;

    return (
      <div>
        <button
          type="button"
          draggable={true}
          class="flex w-full items-center gap-1 border-b border-border/60 px-2 py-1 text-left text-xs hover:bg-accent"
          classList={{
            "bg-accent": isSelected(),
            "bg-amber-200/60": isDropTarget(),
          }}
          style={{ "padding-left": `${depth * 12 + 8}px` }}
          onDragStart={(event) => {
            filetreeLogic.handleNodeDragStart(node, event);
          }}
          onDragEnd={() => {
            filetreeLogic.handleNodeDragEnd();
          }}
          onDragEnter={(event) => {
            filetreeLogic.handleNodeDragEnter(node, parentPath, event);
          }}
          onDragOver={(event) => {
            filetreeLogic.handleNodeDragOver(node, parentPath, event);
          }}
          onDragLeave={(event) => {
            filetreeLogic.handleNodeDragLeave(node.path, event);
          }}
          onDrop={(event) => {
            filetreeLogic.handleNodeDrop(node, parentPath, event);
          }}
          onClick={() => {
            filetreeLogic.handleNodeClick(node);
          }}
        >
          <Show when={node.is_dir} fallback={<span class="w-3" />}>
            <Show when={isOpen()} fallback={<ChevronRight size={12} class="text-muted-foreground" />}>
              <ChevronDown size={12} class="text-muted-foreground" />
            </Show>
          </Show>

          <Show when={node.is_dir} fallback={<FileIcon size={12} class="text-muted-foreground" />}>
            <Show when={isOpen()} fallback={<Folder size={12} class="text-muted-foreground" />}>
              <FolderOpen size={12} class="text-muted-foreground" />
            </Show>
          </Show>

          <span class="truncate">{node.name}</span>
        </button>

        <Show when={node.is_dir && isOpen()}>
          <For each={node.children}>{(child) => renderTree(child, depth + 1, node.path)}</For>
        </Show>
      </div>
    );
  };

  return (
    <div
      data-filetree-widget-root="true"
      data-hosted-widget-focus-root="true"
      tabIndex={-1}
      class="flex h-full min-h-0 flex-1 flex-col bg-card text-card-foreground"
    >
      <div class="flex flex-col gap-2 border-b border-border p-2">
        <div class="flex flex-wrap items-center gap-1">
          <button
            type="button"
            class="inline-flex h-6 items-center gap-1 border border-border bg-secondary px-2 text-xs text-secondary-foreground hover:bg-accent"
            onClick={() => void filetreeLogic.handleSetHome()}
            title="Home"
          >
            <House size={11} /> Home
          </button>
          <button
            type="button"
            class="inline-flex h-6 items-center gap-1 border border-border bg-secondary px-2 text-xs text-secondary-foreground hover:bg-accent"
            onClick={() => void filetreeLogic.handleSetParentPath()}
            title="Up"
          >
            <ArrowUp size={11} /> Up
          </button>
          <button
            type="button"
            class="inline-flex h-6 items-center gap-1 border border-border bg-secondary px-2 text-xs text-secondary-foreground hover:bg-accent"
            onClick={() => {
              filetreeLogic.handleRefresh();
            }}
            title="Refresh"
          >
            <RefreshCw size={11} /> Refresh
          </button>
          <button
            type="button"
            class="inline-flex h-6 items-center gap-1 border border-border bg-secondary px-2 text-xs text-secondary-foreground hover:bg-accent"
            onClick={() => filetreeLogic.setIsPathDialogOpen(true)}
            title="Pick folder"
          >
            <FolderSearch size={11} /> Path
          </button>
        </div>

      </div>

      <div
        class="min-h-0 flex-1 overflow-auto"
        classList={{ "bg-amber-100/50": filetreeLogic.isRootDropTarget() }}
        onDragOver={(event) => {
          filetreeLogic.handleRootDragOver(event);
        }}
        onDragLeave={() => {
          filetreeLogic.handleRootDragLeave();
        }}
        onDrop={(event) => {
          filetreeLogic.handleRootDrop(event);
        }}
      >
        <Show when={!filetreeLogic.isLoading()} fallback={<div class="p-3 text-xs text-muted-foreground">Loading files...</div>}>
          <Show when={!filetreeLogic.errorMessage()} fallback={<div class="p-3 text-xs text-destructive">{filetreeLogic.errorMessage()}</div>}>
            <Show when={(filetreeLogic.treeData()?.children.length ?? 0) > 0} fallback={<div class="p-3 text-xs text-muted-foreground">No files found</div>}>
              <For each={filetreeLogic.treeData()?.children ?? []}>
                {(node) => renderTree(node, 0, filetreeLogic.treeData()?.root ?? "")}
              </For>
            </Show>
          </Show>
        </Show>
      </div>

      <PathPickerDialog
        safeClient={props.safeClient}
        open={filetreeLogic.isPathDialogOpen()}
        onOpenChange={filetreeLogic.setIsPathDialogOpen}
        initialPath={filetreeLogic.currentPath() || null}
        onPathSelected={(path) => filetreeLogic.handlePathSelected(path)}
        title="Select Filetree Folder"
      />
    </div>
  );
}
