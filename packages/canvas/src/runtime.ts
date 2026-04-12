import type { DocHandle } from "@automerge/automerge-repo";
import { createRuntime, createServiceRegistry } from "@vibecanvas/runtime";
import type { TCanvasDoc } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { Group } from "konva/lib/Group";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import { AsyncParallelHook, SyncExitHook, SyncHook } from "@vibecanvas/tapable";
import { createCameraControlPlugin, createContextMenuPlugin, createEventListenerPlugin, createGridPlugin, createGroupPlugin, createHistoryControlPlugin, createImagePlugin, createPenPlugin, createRecorderPlugin, createRenderOrderPlugin, createSceneHydratorPlugin, createSelectPlugin, createSelectionStyleMenuPlugin, createShape1dPlugin, createShape2dPlugin, createTextPlugin, createToolbarPlugin, createTransformPlugin, createVisualDebugPlugin } from "./new-plugins";
import { CameraService } from "./new-services/camera/CameraService";
import { ContextMenuService } from "./new-services/context-menu/ContextMenuService";
import { CrdtService } from "./new-services/crdt/CrdtService";
import { EditorService } from "./new-services/editor/EditorService";
import { HistoryService } from "./new-services/history/HistoryService";
import { RenderOrderService } from "./new-services/render-order/RenderOrderService";
import { RenderService } from "./new-services/render/RenderService";
import { SelectionService } from "./new-services/selection/SelectionService";
import { ThemeService } from "./new-services/theme/ThemeService";

interface IRuntimeConfig {
  container: HTMLDivElement;
  docHandle: DocHandle<TCanvasDoc>;
  onToggleSidebar: () => void;
  env: Pick<ImportMetaEnv, "DEV">;
  themeService?: ThemeService;
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
    render: RenderService;
    renderOrder: RenderOrderService;
    selection: SelectionService;
    theme: ThemeService;
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
  ];

  if (config.env.DEV) {
    plugins.splice(5, 0, createRecorderPlugin());
  }

  const services = createServiceRegistry();
  const render = new RenderService({
    container: config.container,
    docHandle: config.docHandle,
  });

  services.provide("camera", new CameraService({ render }));
  services.provide("contextMenu", new ContextMenuService());
  services.provide("crdt", new CrdtService({ docHandle: config.docHandle }));
  services.provide("editor", new EditorService());
  const history = new HistoryService();

  services.provide("history", history);
  services.provide("render", render);
  services.provide("renderOrder", new RenderOrderService({
    crdt: services.require("crdt"),
    history,
    render,
  }));
  services.provide("selection", new SelectionService());
  services.provide("theme", config.themeService ?? new ThemeService());

  return createRuntime<IHooks, IRuntimeConfig>({
    config,
    hooks: createHooks(),
    plugins,
    services,
    boot: async ({ services, hooks }) => {
      services.require("render").start();
      services.require("crdt").start();
      services.require("camera").start();
      hooks.init.call();
      await hooks.initAsync.promise();
    },
    shutdown: async ({ services, hooks }) => {
      hooks.destroy.call();
      services.require("camera").stop();
      services.require("crdt").stop();
      services.require("render").stop();
    },
  })
}
