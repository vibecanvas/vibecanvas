import { applyChangesToCRDT } from "@/features/canvas-crdt/changes";
import type { AElement } from "@/features/canvas-crdt/renderables/element.abstract";
import { orpcWebsocketService } from "@/services/orpc-websocket";
import type { TBackendFileTree } from "@/types/backend.types";
import { PathPickerDialog } from "@/components/path-picker-dialog";
import { toTildePath } from "@/utils/path-display";
import type { Accessor } from "solid-js";
import { For, Show, createEffect, createResource, createSignal, on, onCleanup, onMount } from "solid-js";
import ChevronDown from "lucide-solid/icons/chevron-down";
import ChevronRight from "lucide-solid/icons/chevron-right";
import FileIcon from "lucide-solid/icons/file";
import Folder from "lucide-solid/icons/folder";
import FolderOpen from "lucide-solid/icons/folder-open";
import House from "lucide-solid/icons/house";
import RefreshCw from "lucide-solid/icons/refresh-cw";
import ArrowUp from "lucide-solid/icons/arrow-up";
import FolderSearch from "lucide-solid/icons/folder-search";
import { FiletreeHeader } from "./filetree-header";

export type TFiletreeBounds = {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  scale: number;
};

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

type TTreeNode = {
  name: string;
  path: string;
  is_dir: boolean;
  children: TTreeNode[];
};

type TDraggedFiletreeNode = {
  path: string;
  name: string;
  is_dir: boolean;
};

const FILETREE_CHAT_DND_MIME = "application/x-vibecanvas-filetree-node";
const FILETREE_MOVE_DND_MIME = "application/x-vibecanvas-filetree-move";
const FOLDER_AUTO_OPEN_DELAY_MS = 1000;

export function Filetree(props: TFiletreeProps) {
  let isDragging = false;
  let lastPos = { x: 0, y: 0 };
  let globDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let folderAutoOpenTimer: ReturnType<typeof setTimeout> | null = null;
  let folderAutoOpenTargetPath: string | null = null;
  let didEnsureFiletreeRow = false;
  let didHydrateGlobInput = false;
  const lazyLoadedFolderPaths = new Set<string>();

  let watchAbort: AbortController | null = null;
  let currentWatchUuid: string | null = null;

  const stopWatching = () => {
    watchAbort?.abort();
    watchAbort = null;
    if (currentWatchUuid) {
      void orpcWebsocketService.safeClient.api.filetree.unwatch({ params: { uuid: currentWatchUuid } });
      currentWatchUuid = null;
    }
  };

  const [currentPath, setCurrentPath] = createSignal("");
  const [homePath, setHomePath] = createSignal<string | null>(null);
  const [globInput, setGlobInput] = createSignal("");
  const [isGlobDirty, setIsGlobDirty] = createSignal(false);
  const [appliedGlob, setAppliedGlob] = createSignal<string | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [openFolders, setOpenFolders] = createSignal<Set<string>>(new Set());
  const [selectedRowPath, setSelectedRowPath] = createSignal<string | null>(null);
  const [isPathDialogOpen, setIsPathDialogOpen] = createSignal(false);
  const [draggedNode, setDraggedNode] = createSignal<TDraggedFiletreeNode | null>(null);
  const [dragOverTargetPath, setDragOverTargetPath] = createSignal<string | null>(null);
  const [isRootDropTarget, setIsRootDropTarget] = createSignal(false);
  const [isDragMoveCancelled, setIsDragMoveCancelled] = createSignal(false);

  const clearFolderAutoOpenTimer = () => {
    if (!folderAutoOpenTimer) return;
    clearTimeout(folderAutoOpenTimer);
    folderAutoOpenTimer = null;
    folderAutoOpenTargetPath = null;
  };

  const clearMoveDragState = () => {
    clearFolderAutoOpenTimer();
    setDraggedNode(null);
    setDragOverTargetPath(null);
    setIsRootDropTarget(false);
    setIsDragMoveCancelled(false);
  };

  const [filetree, { mutate: mutateFiletree, refetch: refetchFiletree }] = createResource(
    () => ({ canvasId: props.canvasId, filetreeId: props.filetreeId }),
    async ({ canvasId, filetreeId }): Promise<TBackendFileTree | null> => {
      const [canvasError, canvasResult] = await orpcWebsocketService.safeClient.api.canvas.get({ params: { id: canvasId } });
      if (canvasError || !canvasResult) {
        setErrorMessage(canvasError?.message ?? "Failed to load file tree");
        return null;
      }

      const row = canvasResult.fileTrees.find((candidate) => candidate.id === filetreeId);
      if (!row) return null;

      return {
        ...row,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      };
    }
  );

  const fetchTreeData = async (path: string, globPattern: string | null) => {
    const [listError, listResult] = await orpcWebsocketService.safeClient.api.file.files({
      query: {
        path,
        glob_pattern: globPattern ?? undefined,
        max_depth: 5,
      },
    });

    if (listError || !listResult || "type" in listResult) {
      setErrorMessage(listError?.message ?? (listResult && "message" in listResult ? listResult.message : "Failed to load files"));
      return null;
    }

    return listResult;
  };

  const loadHomePath = async () => {
    const [homeError, homeResult] = await orpcWebsocketService.safeClient.api.file.home();
    if (homeError || !homeResult || "type" in homeResult) return;
    setHomePath(homeResult.path);
  };

  const [treeData, { mutate: mutateTreeData, refetch: refetchTreeData }] = createResource(
    () => {
      const path = currentPath();
      if (!path) return null;
      return { path, globPattern: appliedGlob() };
    },
    async (source) => {
      if (!source) return null;
      setIsLoading(true);
      setErrorMessage(null);
      const result = await fetchTreeData(source.path, source.globPattern);
      setIsLoading(false);
      return result;
    }
  );

  const startWatching = async (path: string) => {
    stopWatching();

    const uuid = crypto.randomUUID();
    currentWatchUuid = uuid;
    const abort = new AbortController();
    watchAbort = abort;

    const [err, iterator] = await orpcWebsocketService.safeClient.api.filetree.watch({
      params: { uuid, path },
    });
    if (err || !iterator || abort.signal.aborted) return;

    try {
      for await (const _event of iterator) {
        if (abort.signal.aborted) break;
        lazyLoadedFolderPaths.clear();
        void refetchTreeData();
      }
    } catch {
      // stream ended or aborted
    }
  };

  const normalizeGlob = (value: string | null | undefined): string | null => {
    const normalized = (value ?? "").trim();
    return normalized === "" ? null : normalized;
  };

  const normalizePathForCompare = (path: string): string => path.replaceAll("\\", "/").replace(/\/+$/, "");

  const isPathDescendant = (path: string, maybeDescendant: string): boolean => {
    const parent = normalizePathForCompare(path);
    const child = normalizePathForCompare(maybeDescendant);
    if (child === parent) return false;
    return child.startsWith(`${parent}/`);
  };

  const parseDraggedMoveNode = (event: DragEvent): TDraggedFiletreeNode | null => {
    const raw = event.dataTransfer?.getData(FILETREE_MOVE_DND_MIME);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as {
        path?: unknown;
        name?: unknown;
        is_dir?: unknown;
      };

      if (typeof parsed.path !== "string") return null;
      if (typeof parsed.name !== "string") return null;
      if (typeof parsed.is_dir !== "boolean") return null;

      return {
        path: parsed.path,
        name: parsed.name,
        is_dir: parsed.is_dir,
      };
    } catch {
      return null;
    }
  };

  const hasMoveDragPayload = (event: DragEvent): boolean => {
    const types = event.dataTransfer?.types;
    if (!types) return false;
    return Array.from(types).includes(FILETREE_MOVE_DND_MIME);
  };

  const isDragLeaveStillInsideCurrentTarget = (event: DragEvent): boolean => {
    const currentTarget = event.currentTarget as HTMLElement | null;
    if (!currentTarget) return false;

    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && currentTarget.contains(relatedTarget)) return true;

    const hoveredElement = document.elementFromPoint(event.clientX, event.clientY);
    return hoveredElement ? currentTarget.contains(hoveredElement) : false;
  };

  const ensureFolderAutoOpen = (node: TTreeNode) => {
    if (!node.is_dir) return;
    if (openFolders().has(node.path)) return;
    if (folderAutoOpenTargetPath === node.path && folderAutoOpenTimer) return;

    clearFolderAutoOpenTimer();
    folderAutoOpenTargetPath = node.path;
    folderAutoOpenTimer = setTimeout(() => {
      setOpenFolders((previous) => {
        const next = new Set(previous);
        next.add(node.path);
        return next;
      });

      if (node.children.length === 0) {
        void loadSubdirectoryChildren(node.path);
      }

      clearFolderAutoOpenTimer();
    }, FOLDER_AUTO_OPEN_DELAY_MS);
  };

  const canDropNodeIntoDestination = (node: TDraggedFiletreeNode, destinationPath: string): boolean => {
    if (isDragMoveCancelled()) return false;
    const normalizedDestination = normalizePathForCompare(destinationPath);
    if (!normalizedDestination) return false;
    if (node.is_dir && (normalizedDestination === normalizePathForCompare(node.path) || isPathDescendant(node.path, destinationPath))) {
      return false;
    }
    return true;
  };

  const replaceNodeChildren = (nodes: TTreeNode[], targetPath: string, nextChildren: TTreeNode[]): TTreeNode[] => {
    let changed = false;
    const mapped = nodes.map((node) => {
      if (node.path === targetPath && node.is_dir) {
        changed = true;
        return { ...node, children: nextChildren };
      }

      if (!node.is_dir || node.children.length === 0) {
        return node;
      }

      const replacedChildren = replaceNodeChildren(node.children, targetPath, nextChildren);
      if (replacedChildren !== node.children) {
        changed = true;
        return { ...node, children: replacedChildren };
      }

      return node;
    });

    return changed ? mapped : nodes;
  };

  const loadSubdirectoryChildren = async (folderPath: string) => {
    if (lazyLoadedFolderPaths.has(folderPath)) return;

    const result = await fetchTreeData(folderPath, appliedGlob());
    if (!result) return;

    lazyLoadedFolderPaths.add(folderPath);
    mutateTreeData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        children: replaceNodeChildren(prev.children, folderPath, result.children),
      };
    });
  };

  const moveNodeIntoFolder = async (node: TDraggedFiletreeNode, destinationFolderPath: string) => {
    const [moveError, moveResult] = await orpcWebsocketService.safeClient.api.file.move({
      body: {
        source_path: node.path,
        destination_dir_path: destinationFolderPath,
      },
    });

    if (moveError || !moveResult || "type" in moveResult) {
      setErrorMessage(moveError?.message ?? (moveResult && "message" in moveResult ? moveResult.message : "Failed to move file or folder"));
      return;
    }

    if (!moveResult.moved) return;

    lazyLoadedFolderPaths.clear();
    setSelectedRowPath(moveResult.target_path);
    void refetchTreeData();
  };

  const ensureRowExists = async () => {
    if (filetree()) return;

    let initialPath = localStorage.getItem('vibecanvas-filetree-last-path');
    if (!initialPath) {
      const [homeError, homeResult] = await orpcWebsocketService.safeClient.api.file.home();
      if (homeError || !homeResult || "type" in homeResult) {
        setErrorMessage(homeError?.message ?? "Failed to resolve home directory");
        return;
      }
      initialPath = homeResult.path;
    }

    const [createError, created] = await orpcWebsocketService.safeClient.api.filetree.create({
      canvas_id: props.canvasId,
      path: initialPath,
      x: 0,
      y: 0,
    });

    if (createError || !created) {
      setErrorMessage(createError?.message ?? "Failed to create file tree");
      return;
    }

    mutateFiletree({
      ...created,
      created_at: new Date(created.created_at),
      updated_at: new Date(created.updated_at),
    });
  };

  const updateFiletree = async (updates: { path?: string; glob_pattern?: string | null; title?: string }) => {
    if (updates.path) localStorage.setItem('vibecanvas-filetree-last-path', updates.path);
    const [updateError, updated] = await orpcWebsocketService.safeClient.api.filetree.update({
      params: { id: props.filetreeId },
      body: updates,
    });

    if (updateError || !updated) {
      setErrorMessage(updateError?.message ?? "Failed to update file tree");
      return;
    }

    mutateFiletree({
      ...updated,
      created_at: new Date(updated.created_at),
      updated_at: new Date(updated.updated_at),
    });
  };

  const handleSetHome = async () => {
    const [homeError, homeResult] = await orpcWebsocketService.safeClient.api.file.home();
    if (homeError || !homeResult || "type" in homeResult) {
      setErrorMessage(homeError?.message ?? "Failed to resolve home directory");
      return;
    }
    setHomePath(homeResult.path);
    setCurrentPath(homeResult.path);
    await updateFiletree({ path: homeResult.path });
  };

  const handleSetParentPath = async () => {
    if (!currentPath()) return;
    const [listError, listResult] = await orpcWebsocketService.safeClient.api.file.list({
      query: { path: currentPath() },
    });

    if (listError || !listResult || "type" in listResult || !listResult.parent) {
      return;
    }

    setCurrentPath(listResult.parent);
    await updateFiletree({ path: listResult.parent });
  };

  const toggleFolder = (path: string) => {
    setOpenFolders((previous) => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handlePointerDown = (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    isDragging = true;
    lastPos = { x: event.clientX, y: event.clientY };
    props.onSelect();
    props.onDragStart();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging) return;
    event.preventDefault();

    const scale = props.bounds().scale;
    const dx = (event.clientX - lastPos.x) / scale;
    const dy = (event.clientY - lastPos.y) / scale;
    lastPos = { x: event.clientX, y: event.clientY };
    props.onDrag({ x: dx, y: dy });
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (!isDragging) return;
    isDragging = false;
    props.onDragEnd();
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
  };

  const handleWindowKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    if (!draggedNode()) return;

    event.preventDefault();
    clearFolderAutoOpenTimer();
    setDragOverTargetPath(null);
    setIsRootDropTarget(false);
    setIsDragMoveCancelled(true);
  };

  onMount(() => {
    void refetchFiletree();
    void loadHomePath();
    window.addEventListener("keydown", handleWindowKeyDown);
  });

  createEffect(() => {
    if (didEnsureFiletreeRow) return;
    if (filetree.loading) return;
    if (errorMessage()) {
      didEnsureFiletreeRow = true;
      return;
    }
    if (filetree()) {
      didEnsureFiletreeRow = true;
      return;
    }

    didEnsureFiletreeRow = true;
    void ensureRowExists();
  });

  createEffect(on(filetree, (row) => {
    if (!row) return;
    setCurrentPath(row.path);

    const persistedGlob = normalizeGlob(row.glob_pattern);
    if (!isGlobDirty()) {
      setAppliedGlob(persistedGlob);
    }

    if (!didHydrateGlobInput) {
      setGlobInput(row.glob_pattern ?? "");
      setIsGlobDirty(false);
      didHydrateGlobInput = true;
      return;
    }

    const draftGlob = normalizeGlob(globInput());
    if (persistedGlob === draftGlob) {
      setIsGlobDirty(false);
    }
  }));

  createEffect(on(
    () => `${currentPath()}::${appliedGlob() ?? ""}`,
    () => {
      lazyLoadedFolderPaths.clear();
    }
  ));

  createEffect(() => {
    const tree = treeData();
    if (!tree) return;

    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.add(tree.root);
      return next;
    });
  });

  createEffect(on(globInput, (globValue) => {
    if (globDebounceTimer) clearTimeout(globDebounceTimer);
    globDebounceTimer = setTimeout(() => {
      const normalizedNullable = normalizeGlob(globValue);
      setAppliedGlob(normalizedNullable);

      const existingGlob = filetree()?.glob_pattern ?? null;
      if (existingGlob !== normalizedNullable) {
        void updateFiletree({ glob_pattern: normalizedNullable });
      } else {
        setIsGlobDirty(false);
      }
    }, 300);
  }));

  createEffect(on(currentPath, (path) => {
    if (!path) return;
    void startWatching(path);
  }));

  onCleanup(() => {
    if (globDebounceTimer) clearTimeout(globDebounceTimer);
    clearFolderAutoOpenTimer();
    window.removeEventListener("keydown", handleWindowKeyDown);
    stopWatching();
  });

  const renderTree = (node: TTreeNode, depth: number, parentPath: string) => {
    const isOpen = () => openFolders().has(node.path);
    const isSelected = () => selectedRowPath() === node.path;
    const isDropTarget = () => dragOverTargetPath() === node.path;
    const destinationPath = node.is_dir ? node.path : parentPath;

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
            const payload = {
              path: node.path,
              name: node.name,
              is_dir: node.is_dir,
            };

            setDraggedNode(payload);
            setIsDragMoveCancelled(false);
            event.dataTransfer?.setData(FILETREE_CHAT_DND_MIME, JSON.stringify(payload));
            event.dataTransfer?.setData(FILETREE_MOVE_DND_MIME, JSON.stringify(payload));
            event.dataTransfer?.setData("text/plain", `@${node.path}`);
            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = "copyMove";
            }
          }}
          onDragEnd={() => {
            clearMoveDragState();
          }}
          onDragEnter={(event) => {
            if (!hasMoveDragPayload(event) && !draggedNode()) return;
            const currentDraggedNode = draggedNode();
            if (!currentDraggedNode) return;
            if (!canDropNodeIntoDestination(currentDraggedNode, destinationPath)) return;

            setDragOverTargetPath(node.path);
            setIsRootDropTarget(false);

            ensureFolderAutoOpen(node);
          }}
          onDragOver={(event) => {
            if (!hasMoveDragPayload(event) && !draggedNode()) return;
            const currentDraggedNode = draggedNode();
            if (!currentDraggedNode) return;
            if (!canDropNodeIntoDestination(currentDraggedNode, destinationPath)) return;

            event.preventDefault();
            if (event.dataTransfer) {
              event.dataTransfer.dropEffect = "move";
            }
            setDragOverTargetPath(node.path);
            setIsRootDropTarget(false);
            ensureFolderAutoOpen(node);
          }}
          onDragLeave={(event) => {
            if (isDragLeaveStillInsideCurrentTarget(event)) {
              return;
            }
            if (dragOverTargetPath() === node.path) {
              setDragOverTargetPath(null);
            }

            if (folderAutoOpenTargetPath === node.path) {
              clearFolderAutoOpenTimer();
            }
          }}
          onDrop={(event) => {
            clearFolderAutoOpenTimer();
            setDragOverTargetPath(null);
            setIsRootDropTarget(false);

            const droppedNode = parseDraggedMoveNode(event) ?? draggedNode();
            if (!droppedNode) return;
            if (!canDropNodeIntoDestination(droppedNode, destinationPath)) return;

            event.preventDefault();
            void moveNodeIntoFolder(droppedNode, destinationPath);
          }}
          onClick={() => {
            setSelectedRowPath(node.path);
            if (!node.is_dir) return;
            const isCurrentlyOpen = openFolders().has(node.path);
            toggleFolder(node.path);
            if (!isCurrentlyOpen && node.children.length === 0) {
              void loadSubdirectoryChildren(node.path);
            }
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
        title={filetree()?.title ?? "File Tree"}
        subtitle={toTildePath(currentPath() || "", homePath())}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
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
            onClick={() => void handleSetHome()}
            title="Home"
          >
            <House size={11} /> Home
          </button>
          <button
            type="button"
            class="h-6 px-2 border border-border bg-secondary text-secondary-foreground hover:bg-accent text-xs inline-flex items-center gap-1"
            onClick={() => void handleSetParentPath()}
            title="Up"
          >
            <ArrowUp size={11} /> Up
          </button>
          <button
            type="button"
            class="h-6 px-2 border border-border bg-secondary text-secondary-foreground hover:bg-accent text-xs inline-flex items-center gap-1"
            onClick={() => {
              lazyLoadedFolderPaths.clear();
              void refetchTreeData();
            }}
            title="Refresh"
          >
            <RefreshCw size={11} /> Refresh
          </button>
          <button
            type="button"
            class="h-6 px-2 border border-border bg-secondary text-secondary-foreground hover:bg-accent text-xs inline-flex items-center gap-1"
            onClick={() => setIsPathDialogOpen(true)}
            title="Pick folder"
          >
            <FolderSearch size={11} /> Path
          </button>
        </div>
        <input
          class="h-7 px-2 border border-border bg-background text-xs"
          value={globInput()}
          onInput={(event) => {
            setIsGlobDirty(true);
            setGlobInput(event.currentTarget.value);
          }}
          placeholder="Glob pattern (optional)"
        />
      </div>

      <div
        class="flex-1 overflow-auto"
        classList={{ "bg-amber-100/50": isRootDropTarget() }}
        onDragOver={(event) => {
          if (event.defaultPrevented) return;
          if (!hasMoveDragPayload(event) && !draggedNode()) return;
          const currentDraggedNode = draggedNode();
          const rootPath = treeData()?.root;
          if (!currentDraggedNode || !rootPath) return;
          if (!canDropNodeIntoDestination(currentDraggedNode, rootPath)) return;

          event.preventDefault();
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
          }
          setDragOverTargetPath(null);
          setIsRootDropTarget(true);
        }}
        onDragLeave={() => {
          setIsRootDropTarget(false);
        }}
        onDrop={(event) => {
          if (event.defaultPrevented) return;

          const droppedNode = parseDraggedMoveNode(event) ?? draggedNode();
          const rootPath = treeData()?.root;
          setIsRootDropTarget(false);
          setDragOverTargetPath(null);
          clearFolderAutoOpenTimer();

          if (!droppedNode || !rootPath) return;
          if (!canDropNodeIntoDestination(droppedNode, rootPath)) return;

          event.preventDefault();
          void moveNodeIntoFolder(droppedNode, rootPath);
        }}
      >
        <Show when={!isLoading()} fallback={<div class="p-3 text-xs text-muted-foreground">Loading files...</div>}>
          <Show when={!errorMessage()} fallback={<div class="p-3 text-xs text-destructive">{errorMessage()}</div>}>
            <Show when={(treeData()?.children.length ?? 0) > 0} fallback={<div class="p-3 text-xs text-muted-foreground">No files found</div>}>
              <For each={treeData()?.children ?? []}>{(node) => renderTree(node, 0, treeData()?.root ?? "")}</For>
            </Show>
          </Show>
        </Show>
      </div>

      <PathPickerDialog
        open={isPathDialogOpen()}
        onOpenChange={setIsPathDialogOpen}
        initialPath={currentPath() || null}
        onPathSelected={async (path) => {
          setCurrentPath(path);
          await updateFiletree({ path });
          setIsPathDialogOpen(false);
        }}
        title="Select Filetree Folder"
      />
    </div>
  );
}
