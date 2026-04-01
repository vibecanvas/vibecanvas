import { createEffect, createResource, createSignal, on, onCleanup, onMount } from "solid-js";
import type {
  TFiletreeFilesResponse,
  TFiletreeNode,
  TFiletreeRow,
  TFiletreeSafeClient,
} from "../../services/canvas/interface";

export type TDraggedFiletreeNode = {
  path: string;
  name: string;
  is_dir: boolean;
};

const FILETREE_CHAT_DND_MIME = "application/x-vibecanvas-filetree-node";
const FILETREE_MOVE_DND_MIME = "application/x-vibecanvas-filetree-move";
const FOLDER_AUTO_OPEN_DELAY_MS = 1000;
const WATCH_KEEPALIVE_INTERVAL_MS = 10_000;
const LAST_FILETREE_PATH_KEY = "vibecanvas-filetree-last-path";

type TCreateFiletreeContextLogicArgs = {
  canvasId: string;
  filetreeId: string;
  safeClient: TFiletreeSafeClient;
};

export function createFiletreeContextLogic(args: TCreateFiletreeContextLogicArgs) {
  let globDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let folderAutoOpenTimer: ReturnType<typeof setTimeout> | null = null;
  let folderAutoOpenTargetPath: string | null = null;
  let didHydrateGlobInput = false;
  const lazyLoadedFolderPaths = new Set<string>();

  let watchAbort: AbortController | null = null;
  let activeWatchId: string | null = null;
  let keepaliveInterval: ReturnType<typeof setInterval> | null = null;

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

  const clearKeepaliveInterval = () => {
    if (!keepaliveInterval) return;
    clearInterval(keepaliveInterval);
    keepaliveInterval = null;
  };

  const stopWatching = () => {
    const watchId = activeWatchId;
    activeWatchId = null;
    clearKeepaliveInterval();
    watchAbort?.abort();
    watchAbort = null;

    if (!watchId) return;
    void args.safeClient.api.filesystem.unwatch({ watchId });
  };

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

  const [filetree, { refetch: refetchFiletree, mutate: mutateFiletree }] = createResource(
    () => ({ canvasId: args.canvasId, filetreeId: args.filetreeId }),
    async ({ canvasId, filetreeId }): Promise<TFiletreeRow | null> => {
      const [canvasError, canvasResult] = await args.safeClient.api.canvas.get({ params: { id: canvasId } });
      if (canvasError || !canvasResult) {
        setErrorMessage(canvasError && "message" in (canvasError as object) ? (canvasError as { message?: string }).message ?? "Failed to load file tree" : "Failed to load file tree");
        return null;
      }

      return canvasResult.fileTrees.find((candidate) => candidate.id === filetreeId) ?? null;
    },
  );

  const fetchTreeData = async (path: string, globPattern: string | null) => {
    const [listError, listResult] = await args.safeClient.api.filesystem.files({
      query: {
        path,
        glob_pattern: globPattern ?? undefined,
        max_depth: 5,
      },
    });

    if (listError || !listResult || "type" in listResult) {
      setErrorMessage(listError && "message" in (listError as object) ? (listError as { message?: string }).message ?? "Failed to load files" : (listResult && "message" in listResult ? listResult.message : "Failed to load files"));
      return null;
    }

    return listResult;
  };

  const loadHomePath = async () => {
    const [homeError, homeResult] = await args.safeClient.api.filesystem.home();
    if (homeError || !homeResult || "type" in homeResult) return;
    setHomePath(homeResult.path);
  };

  const [treeData, { mutate: mutateTreeData, refetch: refetchTreeData }] = createResource(
    () => {
      const path = currentPath();
      if (!path) return null;
      return { path, globPattern: appliedGlob() };
    },
    async (source): Promise<TFiletreeFilesResponse | null> => {
      if (!source) return null;
      setIsLoading(true);
      setErrorMessage(null);
      const result = await fetchTreeData(source.path, source.globPattern);
      setIsLoading(false);
      return result;
    },
  );

  const startWatching = async (path: string) => {
    stopWatching();

    const abort = new AbortController();
    const watchId = crypto.randomUUID();
    watchAbort = abort;
    activeWatchId = watchId;

    const [err, iterator] = await args.safeClient.api.filesystem.watch({ path, watchId }, { signal: abort.signal });
    if (err || !iterator || abort.signal.aborted) {
      if (activeWatchId === watchId) {
        activeWatchId = null;
        watchAbort = null;
        clearKeepaliveInterval();
      }
      return;
    }

    keepaliveInterval = setInterval(async () => {
      if (activeWatchId !== watchId || abort.signal.aborted) return;
      const [keepaliveError, keepaliveResult] = await args.safeClient.api.filesystem.keepaliveWatch({ watchId });
      if (keepaliveError || !keepaliveResult) {
        if (activeWatchId === watchId) {
          stopWatching();
        }
      }
    }, WATCH_KEEPALIVE_INTERVAL_MS);

    try {
      for await (const _event of iterator) {
        if (abort.signal.aborted || activeWatchId !== watchId) break;
        lazyLoadedFolderPaths.clear();
        void refetchTreeData();
      }
    } catch {
      // stream ended or aborted
    } finally {
      if (activeWatchId === watchId) {
        activeWatchId = null;
        watchAbort = null;
        clearKeepaliveInterval();
        void args.safeClient.api.filesystem.unwatch({ watchId });
      }
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
      const parsed = JSON.parse(raw) as { path?: unknown; name?: unknown; is_dir?: unknown };
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

  const ensureFolderAutoOpen = (node: TFiletreeNode) => {
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

  const replaceNodeChildren = (nodes: TFiletreeNode[], targetPath: string, nextChildren: TFiletreeNode[]): TFiletreeNode[] => {
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
    const [moveError, moveResult] = await args.safeClient.api.filesystem.move({
      body: {
        source_path: node.path,
        destination_dir_path: destinationFolderPath,
      },
    });

    if (moveError || !moveResult || "type" in moveResult) {
      setErrorMessage(moveError && "message" in (moveError as object) ? (moveError as { message?: string }).message ?? "Failed to move file or folder" : (moveResult && "message" in moveResult ? moveResult.message : "Failed to move file or folder"));
      return;
    }

    if (!moveResult.moved) return;

    lazyLoadedFolderPaths.clear();
    setSelectedRowPath(moveResult.target_path);
    void refetchTreeData();
  };

  const updateFiletree = async (updates: { path?: string; glob_pattern?: string | null; title?: string }) => {
    if (updates.path) localStorage.setItem(LAST_FILETREE_PATH_KEY, updates.path);
    const [updateError, updated] = await args.safeClient.api.filetree.update({
      params: { id: args.filetreeId },
      body: updates,
    });

    if (updateError || !updated) {
      setErrorMessage(updateError && "message" in (updateError as object) ? (updateError as { message?: string }).message ?? "Failed to update file tree" : "Failed to update file tree");
      return;
    }

    mutateFiletree(updated);
  };

  const handleSetHome = async () => {
    const [homeError, homeResult] = await args.safeClient.api.filesystem.home();
    if (homeError || !homeResult || "type" in homeResult) {
      setErrorMessage(homeError && "message" in (homeError as object) ? (homeError as { message?: string }).message ?? "Failed to resolve home directory" : (homeResult && "message" in homeResult ? homeResult.message : "Failed to resolve home directory"));
      return;
    }
    setHomePath(homeResult.path);
    setCurrentPath(homeResult.path);
    await updateFiletree({ path: homeResult.path });
  };

  const handleSetParentPath = async () => {
    if (!currentPath()) return;
    const [listError, listResult] = await args.safeClient.api.filesystem.list({
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

  const handleWindowKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    if (!draggedNode()) return;

    event.preventDefault();
    clearFolderAutoOpenTimer();
    setDragOverTargetPath(null);
    setIsRootDropTarget(false);
    setIsDragMoveCancelled(true);
  };

  const handleGlobInput = (value: string) => {
    setIsGlobDirty(true);
    setGlobInput(value);
  };

  const handleRefresh = () => {
    lazyLoadedFolderPaths.clear();
    void refetchTreeData();
  };

  const handlePathSelected = async (path: string) => {
    setCurrentPath(path);
    await updateFiletree({ path });
    setIsPathDialogOpen(false);
  };

  const handleNodeDragStart = (node: TFiletreeNode, event: DragEvent) => {
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
  };

  const handleNodeDragEnd = () => {
    clearMoveDragState();
  };

  const handleNodeDragEnter = (node: TFiletreeNode, parentPath: string, event: DragEvent) => {
    if (!hasMoveDragPayload(event) && !draggedNode()) return;
    const currentDraggedNode = draggedNode();
    if (!currentDraggedNode) return;
    const destinationPath = node.is_dir ? node.path : parentPath;
    if (!canDropNodeIntoDestination(currentDraggedNode, destinationPath)) return;

    setDragOverTargetPath(node.path);
    setIsRootDropTarget(false);
    ensureFolderAutoOpen(node);
  };

  const handleNodeDragOver = (node: TFiletreeNode, parentPath: string, event: DragEvent) => {
    if (!hasMoveDragPayload(event) && !draggedNode()) return;
    const currentDraggedNode = draggedNode();
    if (!currentDraggedNode) return;
    const destinationPath = node.is_dir ? node.path : parentPath;
    if (!canDropNodeIntoDestination(currentDraggedNode, destinationPath)) return;

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    setDragOverTargetPath(node.path);
    setIsRootDropTarget(false);
    ensureFolderAutoOpen(node);
  };

  const handleNodeDragLeave = (nodePath: string, event: DragEvent) => {
    if (isDragLeaveStillInsideCurrentTarget(event)) {
      return;
    }
    if (dragOverTargetPath() === nodePath) {
      setDragOverTargetPath(null);
    }

    if (folderAutoOpenTargetPath === nodePath) {
      clearFolderAutoOpenTimer();
    }
  };

  const handleNodeDrop = (node: TFiletreeNode, parentPath: string, event: DragEvent) => {
    clearFolderAutoOpenTimer();
    setDragOverTargetPath(null);
    setIsRootDropTarget(false);

    const droppedNode = parseDraggedMoveNode(event) ?? draggedNode();
    if (!droppedNode) return;
    const destinationPath = node.is_dir ? node.path : parentPath;
    if (!canDropNodeIntoDestination(droppedNode, destinationPath)) return;

    event.preventDefault();
    void moveNodeIntoFolder(droppedNode, destinationPath);
  };

  const handleNodeClick = (node: TFiletreeNode) => {
    setSelectedRowPath(node.path);
    if (!node.is_dir) return;
    const isCurrentlyOpen = openFolders().has(node.path);
    toggleFolder(node.path);
    if (!isCurrentlyOpen && node.children.length === 0) {
      void loadSubdirectoryChildren(node.path);
    }
  };

  const handleRootDragOver = (event: DragEvent) => {
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
  };

  const handleRootDragLeave = () => {
    setIsRootDropTarget(false);
  };

  const handleRootDrop = (event: DragEvent) => {
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
  };

  onMount(() => {
    void refetchFiletree();
    void loadHomePath();
    window.addEventListener("keydown", handleWindowKeyDown);
  });

  createEffect(on(filetree, (row) => {
    if (!row) return;
    setErrorMessage(null);
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

  createEffect(() => {
    if (filetree.loading) return;
    if (filetree()) return;
    setErrorMessage((previous) => previous ?? "File tree data is unavailable");
  });

  createEffect(on(
    () => `${currentPath()}::${appliedGlob() ?? ""}`,
    () => {
      lazyLoadedFolderPaths.clear();
    },
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
    if (!path) {
      stopWatching();
      return;
    }
    void startWatching(path);
  }));

  onCleanup(() => {
    if (globDebounceTimer) clearTimeout(globDebounceTimer);
    clearFolderAutoOpenTimer();
    window.removeEventListener("keydown", handleWindowKeyDown);
    stopWatching();
  });

  return {
    filetree,
    currentPath,
    homePath,
    globInput,
    isLoading,
    errorMessage,
    treeData,
    openFolders,
    selectedRowPath,
    dragOverTargetPath,
    isPathDialogOpen,
    isRootDropTarget,
    setIsPathDialogOpen,
    handleSetHome,
    handleSetParentPath,
    handleGlobInput,
    handleRefresh,
    handlePathSelected,
    handleNodeDragStart,
    handleNodeDragEnd,
    handleNodeDragEnter,
    handleNodeDragOver,
    handleNodeDragLeave,
    handleNodeDrop,
    handleNodeClick,
    handleRootDragOver,
    handleRootDragLeave,
    handleRootDrop,
  };
}
