import type { TOrpcSafeClient } from "@vibecanvas/orpc-client";
import "./styles.css";
import { Tooltip } from "@kobalte/core/tooltip";
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
import type { THostedWidgetElementMap, TFiletreeNode, THostedWidgetChrome } from "../../services/canvas/interface";
import { PathPickerDialog } from "./PathPickerDialog";
import { createFiletreeContextLogic } from "./createFiletreeContextLogic";
import { toTildePath } from "./path-display";

type TFiletreeWidgetProps = {
  element: Accessor<THostedWidgetElementMap["filetree"]>;
  apiService: TOrpcSafeClient;
  setWindowChrome?: (chrome: THostedWidgetChrome | null) => void;
  onPathChange: (path: string) => void;
  onOpenFile?: (path: string) => void;
};

export function FiletreeWidget(props: TFiletreeWidgetProps) {
  const filetreeLogic = createFiletreeContextLogic({
    element: props.element,
    apiService: props.apiService,
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
    const isUnreadable = () => node.is_unreadable === true;
    const unreadableMessage = () => node.unreadable_reason === "permission_denied" ? "Permission denied" : null;

    const row = (
      <button
        type="button"
        draggable={true}
        class="vc-filetree-row"
        classList={{
          "vc-filetree-row--selected": isSelected(),
          "vc-filetree-row--drop-target": isDropTarget(),
          "vc-filetree-row--unreadable": isUnreadable(),
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
        onDblClick={() => {
          if (node.is_dir) return;
          props.onOpenFile?.(node.path);
        }}
      >
        <Show when={node.is_dir && !isUnreadable()} fallback={<span class="vc-filetree-row-spacer" />}>
          <Show when={isOpen()} fallback={<ChevronRight size={12} class="vc-filetree-row-icon--muted" />}>
            <ChevronDown size={12} class="vc-filetree-row-icon--muted" />
          </Show>
        </Show>

        <Show when={node.is_dir} fallback={<FileIcon size={12} class="vc-filetree-row-icon--muted" />}>
          <Show when={isUnreadable()} fallback={<Show when={isOpen()} fallback={<Folder size={12} class="vc-filetree-row-icon--muted" />}><FolderOpen size={12} class="vc-filetree-row-icon--muted" /></Show>}>
            <Folder size={12} class="vc-filetree-row-icon--danger" />
          </Show>
        </Show>

        <span class="vc-filetree-row-label">{node.name}</span>
      </button>
    );

    return (
      <div>
        <Show
          when={isUnreadable() && unreadableMessage()}
          fallback={row}
        >
          <Tooltip openDelay={200} closeDelay={0} placement="right">
            <Tooltip.Trigger as="div">
              {row}
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content class="vc-filetree-tooltip">
                {unreadableMessage()}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip>
        </Show>

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
      class="vc-filetree-widget"
    >
      <div class="vc-filetree-toolbar">
        <div class="vc-filetree-toolbar-row">
          <button
            type="button"
            class="vc-filetree-action vc-filetree-action--compact"
            onClick={() => void filetreeLogic.handleSetHome()}
            title="Home"
          >
            <House size={11} /> Home
          </button>
          <button
            type="button"
            class="vc-filetree-action vc-filetree-action--compact"
            onClick={() => void filetreeLogic.handleSetParentPath()}
            title="Up"
          >
            <ArrowUp size={11} /> Up
          </button>
          <button
            type="button"
            class="vc-filetree-action vc-filetree-action--compact"
            onClick={() => {
              filetreeLogic.handleRefresh();
            }}
            title="Refresh"
          >
            <RefreshCw size={11} /> Refresh
          </button>
          <button
            type="button"
            class="vc-filetree-action vc-filetree-action--compact"
            onClick={() => filetreeLogic.setIsPathDialogOpen(true)}
            title="Pick folder"
          >
            <FolderSearch size={11} /> Path
          </button>
        </div>

      </div>

      <div
        class="vc-filetree-body"
        classList={{ "vc-filetree-body--drop-target": filetreeLogic.isRootDropTarget() }}
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
        <Show when={!filetreeLogic.isLoading()} fallback={<div class="vc-filetree-state">Loading files...</div>}>
          <Show when={!filetreeLogic.errorMessage()} fallback={<div class="vc-filetree-state vc-filetree-state--error">{filetreeLogic.errorMessage()}</div>}>
            <Show when={(filetreeLogic.treeData()?.children.length ?? 0) > 0} fallback={<div class="vc-filetree-state">No files found</div>}>
              <For each={filetreeLogic.treeData()?.children ?? []}>
                {(node) => renderTree(node, 0, filetreeLogic.treeData()?.root ?? "")}
              </For>
            </Show>
          </Show>
        </Show>
      </div>

      <PathPickerDialog
        apiService={props.apiService}
        open={filetreeLogic.isPathDialogOpen()}
        onOpenChange={filetreeLogic.setIsPathDialogOpen}
        initialPath={filetreeLogic.currentPath() || null}
        onPathSelected={(path) => filetreeLogic.handlePathSelected(path)}
        title="Select Filetree Folder"
      />
    </div>
  );
}
