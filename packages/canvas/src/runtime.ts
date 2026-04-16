import type { DocHandle } from "@automerge/automerge-repo";
import { createRuntime, createServiceRegistry, IServiceRegistry } from "@vibecanvas/runtime";
import type { TCanvasDoc } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { Group } from "konva/lib/Group";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import { AsyncParallelHook, SyncExitHook, SyncHook } from "@vibecanvas/tapable";
import {
  createCameraControlPlugin, createContextMenuPlugin, createEventListenerPlugin, createGridPlugin,
  createGroupPlugin, createHistoryControlPlugin, createImagePlugin, createPenPlugin,
  createRecorderPlugin, createRenderOrderPlugin, createSceneHydratorPlugin, createSelectPlugin,
  createSelectionStyleMenuPlugin, createShape1dPlugin, createShape2dPlugin, createTextPlugin,
  createToolbarPlugin, createTransformPlugin, createVisualDebugPlugin, createHostedComponentPlugin
} from "./plugins";
import {
  CameraService, ContextMenuService, CrdtService, EditorService, HistoryService,
  LoggingService, RenderOrderService, SceneService, SelectionService,
  CanvasRegistryService, WidgetManagerService,
} from "./services";
import { ThemeService } from "@vibecanvas/service-theme";


export type TImageUploadFormat = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
export type TUploadImage = (args: {
  base64: string;
  format: TImageUploadFormat;
}) => Promise<{ url: string }>;

export type TCloneImage = (args: {
  url: string;
}) => Promise<{ url: string }>;

export type TDeleteImage = (args: {
  url: string;
}) => Promise<{ ok: true }>;


export interface IRuntimeConfig {
  canvasId: string;
  container: HTMLDivElement;
  docHandle: DocHandle<TCanvasDoc>;
  onToggleSidebar: () => void;
  env: Pick<ImportMetaEnv, "DEV">;
  themeService: ThemeService;
  image?: {
    uploadImage: TUploadImage;
    cloneImage: TCloneImage;
    deleteImage: TDeleteImage;
  };
  notification?: {
    showSuccess(title: string, description?: string): void;
    showError(title: string, description?: string): void;
    showInfo(title: string, description?: string): void;
  };
}


export type TRenderOrderSnapshot = {
  parentId: string;
  items: Array<{
    id: string;
    zIndex: string;
    kind: "element" | "group";
  }>;
};

export type TPointerEvent = Konva.KonvaEventObject<PointerEvent>;
export type TMouseEvent = Konva.KonvaEventObject<MouseEvent>;
export type TWheelEvent = Konva.KonvaEventObject<WheelEvent>;

export type TElementPointerEvent = KonvaEventObject<PointerEvent, Shape<ShapeConfig> | Group>;

export interface IHooks {
  /**
   * Called at the initialization stage.
   */
  init: SyncHook<[]>;
  /**
   * Called at the initialization stage.
   */
  initAsync: AsyncParallelHook<[]>;
  /**
   * Called at the destruction stage.
   */
  destroy: SyncHook<[]>;
  pointerDown: SyncHook<[TPointerEvent]>;
  pointerUp: SyncHook<[TPointerEvent]>;
  pointerOut: SyncHook<[TPointerEvent]>;
  pointerOver: SyncHook<[TPointerEvent]>;
  pointerMove: SyncHook<[TMouseEvent]>;
  pointerWheel: SyncHook<[TWheelEvent]>;
  pointerCancel: SyncHook<[TPointerEvent]>;
  keydown: SyncHook<[KeyboardEvent]>;
  keyup: SyncHook<[KeyboardEvent]>;
  gridVisible: SyncHook<[boolean]>;
  toolSelect: SyncHook<[string]>;
  elementPointerClick: SyncExitHook<[TElementPointerEvent]>;
  elementPointerDown: SyncExitHook<[TElementPointerEvent]>;
  elementPointerDoubleClick: SyncExitHook<[TElementPointerEvent]>;
}

declare module "@vibecanvas/runtime" {
  interface IServiceMap {
    camera: CameraService;
    contextMenu: ContextMenuService;
    crdt: CrdtService;
    editor: EditorService;
    history: HistoryService;
    logging: LoggingService;
    scene: SceneService;
    renderOrder: RenderOrderService;
    selection: SelectionService;
    theme: ThemeService;
    canvasRegistry: CanvasRegistryService;
    widgetManager: WidgetManagerService;
  }
}

function createHooks(): IHooks {
  return {
    init: new SyncHook(),
    initAsync: new AsyncParallelHook(),
    destroy: new SyncHook(),
    pointerDown: new SyncHook(),
    pointerUp: new SyncHook(),
    pointerOut: new SyncHook(),
    pointerOver: new SyncHook(),
    pointerMove: new SyncHook(),
    pointerWheel: new SyncHook(),
    pointerCancel: new SyncHook(),
    keydown: new SyncHook(),
    keyup: new SyncHook(),
    gridVisible: new SyncHook(),
    toolSelect: new SyncHook(),
    elementPointerClick: new SyncExitHook(),
    elementPointerDown: new SyncExitHook(),
    elementPointerDoubleClick: new SyncExitHook(),
  };
}

function createServices(config: {
  container: HTMLDivElement;
  docHandle: DocHandle<TCanvasDoc>;
  themeService: ThemeService;
}): IServiceRegistry {
  const services = createServiceRegistry();
  const scene = new SceneService({ container: config.container, });
  const camera = new CameraService({ scene });
  const canvasRegistry = new CanvasRegistryService();
  const contextMenu = new ContextMenuService();
  const history = new HistoryService();
  const selection = new SelectionService();
  const crdt = new CrdtService({ docHandle: config.docHandle });
  const logging = new LoggingService();
  const editor = new EditorService(scene, canvasRegistry, crdt, selection);
  const widgetManager = new WidgetManagerService({
    crdtService: crdt,
    contextMenuService: contextMenu,
    loggingService: logging,
    editorService: editor,
  });

  const renderOrder = new RenderOrderService({
    crdt,
    history,
    scene,
    canvasRegistry,
  });

  services.provide("scene", 10, scene);
  services.provide("camera", 20, camera);
  services.provide("canvasRegistry", 30, canvasRegistry);
  services.provide("contextMenu", 40, contextMenu);
  services.provide("history", 50, history);
  services.provide("selection", 60, selection);
  services.provide("crdt", 70, crdt);
  services.provide("logging", 80, logging);
  services.provide("editor", 90, editor);
  services.provide("renderOrder", 100, renderOrder);
  services.provide("theme", 110, config.themeService);
  services.provide("widgetManager", 120, widgetManager);

  return services;
}

export function buildRuntime(config: IRuntimeConfig) {
  const plugins: Array<import("@vibecanvas/runtime").IPlugin<any, IHooks, IRuntimeConfig>> = [
    createEventListenerPlugin(),
    createGridPlugin(),
    createToolbarPlugin(),
    createSelectionStyleMenuPlugin(),
    createContextMenuPlugin(),
    createHistoryControlPlugin(),
    createRenderOrderPlugin(),
    createSelectPlugin(),
    createTransformPlugin(),
    createShape1dPlugin(),
    createShape2dPlugin(),
    createPenPlugin(),
    createTextPlugin(),
    createImagePlugin(),
    createGroupPlugin(),
    createSceneHydratorPlugin(),
    createVisualDebugPlugin(),
    createCameraControlPlugin(),
    createHostedComponentPlugin(),
  ];

  if (config.env.DEV) {
    plugins.splice(5, 0, createRecorderPlugin());
  }

  return createRuntime<IHooks, IRuntimeConfig>({
    config,
    hooks: createHooks(),
    plugins,
    services: createServices(config),
    boot: async ({ services, hooks }) => {
      hooks.init.call();
      await hooks.initAsync.promise();
    },
    shutdown: async ({ services, hooks }) => {
      hooks.destroy.call();
    },
  })
}
