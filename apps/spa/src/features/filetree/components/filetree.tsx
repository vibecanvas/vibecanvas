import { applyChangesToCRDT } from "@/features/canvas-crdt/changes";
import type { AElement } from "@/features/canvas-crdt/renderables/element.abstract";
import { orpcWebsocketService } from "@/services/orpc-websocket";
import type { TBackendFileTree } from "@/types/backend.types";
import { PathPickerDialog } from "@/components/path-picker-dialog";
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

const FILETREE_DND_MIME = "application/x-vibecanvas-filetree-node";

export function Filetree(props: TFiletreeProps) {
  let isDragging = false;
  let lastPos = { x: 0, y: 0 };
  let globDebounceTimer: ReturnType<typeof setTimeout> | null = null;
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
  const [globInput, setGlobInput] = createSignal("");
  const [isGlobDirty, setIsGlobDirty] = createSignal(false);
  const [appliedGlob, setAppliedGlob] = createSignal<string | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [openFolders, setOpenFolders] = createSignal<Set<string>>(new Set());
  const [selectedRowPath, setSelectedRowPath] = createSignal<string | null>(null);
  const [isPathDialogOpen, setIsPathDialogOpen] = createSignal(false);

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

  onMount(() => {
    void refetchFiletree();
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
    stopWatching();
  });

  const renderTree = (node: TTreeNode, depth: number) => {
    const isOpen = () => openFolders().has(node.path);
    const isSelected = () => selectedRowPath() === node.path;

    return (
      <div>
        <button
          type="button"
          draggable={true}
          class="w-full text-left px-2 py-1 text-xs flex items-center gap-1 border-b border-border/60 hover:bg-accent"
          classList={{ "bg-accent": isSelected() }}
          style={{ "padding-left": `${depth * 12 + 8}px` }}
          onDragStart={(event) => {
            const payload = {
              path: node.path,
              name: node.name,
              is_dir: node.is_dir,
            };

            event.dataTransfer?.setData(FILETREE_DND_MIME, JSON.stringify(payload));
            event.dataTransfer?.setData("text/plain", `@${node.path}`);
            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = "copy";
            }
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
          <For each={node.children}>{(child) => renderTree(child, depth + 1)}</For>
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
        subtitle={currentPath() || ""}
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
          <input
            class="flex-1 h-7 px-2 border border-border bg-background text-xs"
            value={currentPath()}
            onInput={(event) => setCurrentPath(event.currentTarget.value)}
            placeholder="Base path"
          />
          <button
            type="button"
            class="h-7 px-2 border border-border bg-secondary text-secondary-foreground hover:bg-accent text-xs"
            onClick={() => void updateFiletree({ path: currentPath().trim() })}
          >
            Apply
          </button>
        </div>
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

      <div class="flex-1 overflow-auto">
        <Show when={!isLoading()} fallback={<div class="p-3 text-xs text-muted-foreground">Loading files...</div>}>
          <Show when={!errorMessage()} fallback={<div class="p-3 text-xs text-destructive">{errorMessage()}</div>}>
            <Show when={(treeData()?.children.length ?? 0) > 0} fallback={<div class="p-3 text-xs text-muted-foreground">No files found</div>}>
              <For each={treeData()?.children ?? []}>{(node) => renderTree(node, 0)}</For>
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
