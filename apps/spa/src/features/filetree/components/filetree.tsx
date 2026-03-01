import { PathPickerDialog } from "@/components/path-picker-dialog";
import { applyChangesToCRDT } from "@/features/canvas-crdt/changes";
import type { AElement } from "@/features/canvas-crdt/renderables/element.abstract";
import {
  createFiletreeContextLogic,
  type TFiletreeBounds,
  type TTreeNode,
} from "@/features/filetree/context/filetree.context";
import { toTildePath } from "@/utils/path-display";
import type { Accessor } from "solid-js";
import { For, Show } from "solid-js";
import ArrowUp from "lucide-solid/icons/arrow-up";
import ChevronDown from "lucide-solid/icons/chevron-down";
import ChevronRight from "lucide-solid/icons/chevron-right";
import FileIcon from "lucide-solid/icons/file";
import Folder from "lucide-solid/icons/folder";
import FolderOpen from "lucide-solid/icons/folder-open";
import FolderSearch from "lucide-solid/icons/folder-search";
import House from "lucide-solid/icons/house";
import RefreshCw from "lucide-solid/icons/refresh-cw";
import { FiletreeHeader } from "./filetree-header";

type TFiletreeProps = {
  bounds: Accessor<TFiletreeBounds>;
  filetreeClass: AElement<"filetree">;
  canvasId: string;
  filetreeId: string;
  onSelect: () => void;
  onDragStart: () => void;
  onDrag: (delta: { x: number; y: number }) => void;
  onDragEnd: () => void;
};

export function Filetree(props: TFiletreeProps) {
  const filetreeLogic = createFiletreeContextLogic({
    bounds: props.bounds,
    canvasId: props.canvasId,
    filetreeId: props.filetreeId,
    onSelect: props.onSelect,
    onDragStart: props.onDragStart,
    onDrag: props.onDrag,
    onDragEnd: props.onDragEnd,
  });

  const renderTree = (node: TTreeNode, depth: number, parentPath: string) => {
    const isOpen = () => filetreeLogic.openFolders().has(node.path);
    const isSelected = () => filetreeLogic.selectedRowPath() === node.path;
    const isDropTarget = () => filetreeLogic.dragOverTargetPath() === node.path;

    return (
      <div>
        <button
          type="button"
          draggable={true}
          class="w-full text-left px-2 py-1 text-xs flex items-center gap-1 border-b border-border/60 hover:bg-accent"
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
      class="flex flex-col bg-card text-card-foreground border border-border absolute pointer-events-auto"
      style={{
        left: `${props.bounds().x}px`,
        top: `${props.bounds().y}px`,
        width: `${props.bounds().w}px`,
        height: `${props.bounds().h}px`,
        transform: `translate(-50%, -50%) rotate(${props.bounds().angle}rad) scale(${props.bounds().scale})`,
        "transform-origin": "center",
      }}
    >
      <FiletreeHeader
        title={filetreeLogic.filetree()?.title ?? "File Tree"}
        subtitle={toTildePath(filetreeLogic.currentPath() || "", filetreeLogic.homePath())}
        onPointerDown={filetreeLogic.handlePointerDown}
        onPointerMove={filetreeLogic.handlePointerMove}
        onPointerUp={filetreeLogic.handlePointerUp}
        onCollapse={() => {
          // TODO: collapse support
        }}
        onRemove={() => {
          const handle = props.filetreeClass.canvas.handle;
          const changes = props.filetreeClass.dispatch({ type: "delete" });
          if (changes) applyChangesToCRDT(handle, [changes]);
        }}
      />

      <div class="p-2 border-b border-border flex flex-col gap-2">
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="h-6 px-2 border border-border bg-secondary text-secondary-foreground hover:bg-accent text-xs inline-flex items-center gap-1"
            onClick={() => void filetreeLogic.handleSetHome()}
            title="Home"
          >
            <House size={11} /> Home
          </button>
          <button
            type="button"
            class="h-6 px-2 border border-border bg-secondary text-secondary-foreground hover:bg-accent text-xs inline-flex items-center gap-1"
            onClick={() => void filetreeLogic.handleSetParentPath()}
            title="Up"
          >
            <ArrowUp size={11} /> Up
          </button>
          <button
            type="button"
            class="h-6 px-2 border border-border bg-secondary text-secondary-foreground hover:bg-accent text-xs inline-flex items-center gap-1"
            onClick={() => {
              filetreeLogic.handleRefresh();
            }}
            title="Refresh"
          >
            <RefreshCw size={11} /> Refresh
          </button>
          <button
            type="button"
            class="h-6 px-2 border border-border bg-secondary text-secondary-foreground hover:bg-accent text-xs inline-flex items-center gap-1"
            onClick={() => filetreeLogic.setIsPathDialogOpen(true)}
            title="Pick folder"
          >
            <FolderSearch size={11} /> Path
          </button>
        </div>
        <input
          class="h-7 px-2 border border-border bg-background text-xs"
          value={filetreeLogic.globInput()}
          onInput={(event) => {
            filetreeLogic.handleGlobInput(event.currentTarget.value);
          }}
          placeholder="Glob pattern (optional)"
        />
      </div>

      <div
        class="flex-1 overflow-auto"
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
              <For each={filetreeLogic.treeData()?.children ?? []}>{(node) => renderTree(node, 0, filetreeLogic.treeData()?.root ?? "")}</For>
            </Show>
          </Show>
        </Show>
      </div>

      <PathPickerDialog
        open={filetreeLogic.isPathDialogOpen()}
        onOpenChange={filetreeLogic.setIsPathDialogOpen}
        initialPath={filetreeLogic.currentPath() || null}
        onPathSelected={(path) => filetreeLogic.handlePathSelected(path)}
        title="Select Filetree Folder"
      />
    </div>
  );
}
