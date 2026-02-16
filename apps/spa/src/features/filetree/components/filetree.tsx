import { applyChangesToCRDT } from "@/features/canvas-crdt/changes";
import type { AElement } from "@/features/canvas-crdt/renderables/element.abstract";
import { orpcWebsocketService } from "@/services/orpc-websocket";
import type { TBackendFileTree } from "@/types/backend.types";
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

export function Filetree(props: TFiletreeProps) {
  let isDragging = false;
  let lastPos = { x: 0, y: 0 };
  let globDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let didEnsureFiletreeRow = false;

  const [currentPath, setCurrentPath] = createSignal("");
  const [globInput, setGlobInput] = createSignal("");
  const [appliedGlob, setAppliedGlob] = createSignal<string | null>(null);
  const [children, setChildren] = createSignal<TTreeNode[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [openFolders, setOpenFolders] = createSignal<Set<string>>(new Set());
  const [selectedRowPath, setSelectedRowPath] = createSignal<string | null>(null);

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

  const ensureRowExists = async () => {
    if (filetree()) return;

    const [homeError, homeResult] = await orpcWebsocketService.safeClient.api.project.dir.home();
    if (homeError || !homeResult || "type" in homeResult) {
      setErrorMessage(homeError?.message ?? "Failed to resolve home directory");
      return;
    }

    const [createError, created] = await orpcWebsocketService.safeClient.api.filetree.create({
      id: props.filetreeId,
      canvas_id: props.canvasId,
      title: "File Tree",
      path: homeResult.path,
      glob_pattern: undefined,
      locked: false,
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

  const loadFiles = async (path: string, globPattern: string | null) => {
    setIsLoading(true);
    setErrorMessage(null);

    const [listError, listResult] = await orpcWebsocketService.safeClient.api.project.dir.files({
      query: {
        path,
        glob_pattern: globPattern ?? undefined,
        max_depth: 5,
      },
    });

    setIsLoading(false);

    if (listError || !listResult || "type" in listResult) {
      setErrorMessage(listError?.message ?? (listResult && "message" in listResult ? listResult.message : "Failed to load files"));
      return;
    }

    setChildren(listResult.children);
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.add(listResult.root);
      return next;
    });
  };

  const handleSetHome = async () => {
    const [homeError, homeResult] = await orpcWebsocketService.safeClient.api.project.dir.home();
    if (homeError || !homeResult || "type" in homeResult) {
      setErrorMessage(homeError?.message ?? "Failed to resolve home directory");
      return;
    }
    setCurrentPath(homeResult.path);
    await updateFiletree({ path: homeResult.path });
  };

  const handleSetParentPath = async () => {
    if (!currentPath()) return;
    const [listError, listResult] = await orpcWebsocketService.safeClient.api.project.dir.list({
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
    const nextGlob = row.glob_pattern ?? "";
    setGlobInput(nextGlob);
    setAppliedGlob(nextGlob || null);
  }));

  createEffect(() => {
    const path = currentPath();
    if (!path) return;
    void loadFiles(path, appliedGlob());
  });

  createEffect(on(globInput, (globValue) => {
    if (globDebounceTimer) clearTimeout(globDebounceTimer);
    globDebounceTimer = setTimeout(() => {
      const normalized = globValue.trim();
      const normalizedNullable = normalized === "" ? null : normalized;
      setAppliedGlob(normalizedNullable);

      const existingGlob = filetree()?.glob_pattern ?? null;
      if (existingGlob !== normalizedNullable) {
        void updateFiletree({ glob_pattern: normalizedNullable });
      }
    }, 300);
  }));

  onCleanup(() => {
    if (globDebounceTimer) clearTimeout(globDebounceTimer);
  });

  const renderTree = (node: TTreeNode, depth: number) => {
    const isOpen = () => openFolders().has(node.path);
    const isSelected = () => selectedRowPath() === node.path;

    return (
      <div>
        <button
          type="button"
          class="w-full text-left px-2 py-1 text-xs flex items-center gap-1 border-b border-border/60 hover:bg-accent"
          classList={{ "bg-accent": isSelected() }}
          style={{ "padding-left": `${depth * 12 + 8}px` }}
          onClick={() => {
            setSelectedRowPath(node.path);
            if (node.is_dir) toggleFolder(node.path);
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
            onClick={() => void loadFiles(currentPath(), appliedGlob())}
            title="Refresh"
          >
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
        <input
          class="h-7 px-2 border border-border bg-background text-xs"
          value={globInput()}
          onInput={(event) => setGlobInput(event.currentTarget.value)}
          placeholder="Glob pattern (optional)"
        />
      </div>

      <div class="flex-1 overflow-auto">
        <Show when={!isLoading()} fallback={<div class="p-3 text-xs text-muted-foreground">Loading files...</div>}>
          <Show when={!errorMessage()} fallback={<div class="p-3 text-xs text-destructive">{errorMessage()}</div>}>
            <Show when={children().length > 0} fallback={<div class="p-3 text-xs text-muted-foreground">No files found</div>}>
              <For each={children()}>{(node) => renderTree(node, 0)}</For>
            </Show>
          </Show>
        </Show>
      </div>
    </div>
  );
}
