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
} from "./new-plugins";
import {
  CameraService, ContextMenuService, CrdtService, EditorService, HistoryService,
  LoggingService, RenderOrderService, SceneService, SelectionService, WidgetService
} from "./new-services";
import { ThemeService } from "@vibecanvas/service-theme";

interface IRuntimeConfig {
  container: HTMLDivElement;
  docHandle: DocHandle<TCanvasDoc>;
  onToggleSidebar: () => void;
  env: Pick<ImportMetaEnv, "DEV">;
  themeService: ThemeService;
  image?: {
    uploadImage: import("./services/canvas/interface").TUploadImage;
    cloneImage: import("./services/canvas/interface").TCloneImage;
    deleteImage: import("./services/canvas/interface").TDeleteImage;
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
    widget: WidgetService;
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
  const scene = new SceneService({
    container: config.container,
    docHandle: config.docHandle,
  });
  const camera = new CameraService({ scene });
  const contextMenu = new ContextMenuService();
  const editor = new EditorService();
  const history = new HistoryService();
  const selection = new SelectionService();
  const widget = new WidgetService(editor);
  const crdt = new CrdtService({ docHandle: config.docHandle });
  const logging = new LoggingService();
  const renderOrder = new RenderOrderService({
    crdt,
    history,
    scene,
    editor,
  });

  services.provide("camera", camera);
  services.provide("contextMenu", contextMenu);
  services.provide("crdt", crdt);
  services.provide("editor", editor);
  services.provide("history", history);
  services.provide("logging", logging);
  services.provide("scene", scene);
  services.provide("renderOrder", renderOrder);
  services.provide("selection", selection);
  services.provide("theme", config.themeService);
  services.provide("widget", widget);


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
      services.require("scene").start();
      services.require("crdt").start();
      services.require("camera").start();
      hooks.init.call();
      await hooks.initAsync.promise();
    },
    shutdown: async ({ services, hooks }) => {
      hooks.destroy.call();
      services.require("camera").stop();
      services.require("crdt").stop();
      services.require("scene").stop();
    },
  })
}
