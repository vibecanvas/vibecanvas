import type { DocHandle } from "@automerge/automerge-repo";
import { createRuntime, createServiceRegistry } from "@vibecanvas/runtime";
import type { TCanvasDoc } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { Group } from "konva/lib/Group";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import { AsyncParallelHook, SyncExitHook, SyncHook } from "@vibecanvas/tapable";
import type { TTool } from "./components/FloatingCanvasToolbar/toolbar.types";
import { createGridPlugin } from "./new-plugins";
import { CameraService } from "./new-services/camera/CameraService";
import { EditorService } from "./new-services/editor/EditorService";
import { RenderService } from "./new-services/render/RenderService";
import { SelectionService } from "./new-services/selection/SelectionService";
import { ThemeService } from "./new-services/theme/ThemeService";

interface IRuntimeConfig {
  container: HTMLDivElement;
  docHandle: DocHandle<TCanvasDoc>;
  onToggleSidebar: () => void;
  env: Pick<ImportMetaEnv, "DEV">;
  // capabilities: {
  //   uploadImage?: TUploadImage;
  //   cloneImage?: TCloneImage;
  //   deleteImage?: TDeleteImage;
  //   filetree?: TFiletreeCapability;
  //   file?: TFileCapability;
  //   terminal?: TTerminalCapability;
  //   notification?: {
  //     showSuccess(title: string, description?: string): void;
  //     showError(title: string, description?: string): void;
  //     showInfo(title: string, description?: string): void;
  //   };
  // };
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
  toolSelect: SyncHook<[TTool]>;
  elementPointerClick: SyncExitHook<[TElementPointerEvent]>;
  elementPointerDown: SyncExitHook<[TElementPointerEvent]>;
  elementPointerDoubleClick: SyncExitHook<[TElementPointerEvent]>;
}

declare module "@vibecanvas/runtime" {
  interface IServiceMap {
    camera: CameraService;
    editor: EditorService;
    render: RenderService;
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
  const services = createServiceRegistry();
  const render = new RenderService({
    container: config.container,
    docHandle: config.docHandle,
  });

  services.provide("camera", new CameraService({ render }));
  services.provide("editor", new EditorService());
  services.provide("render", render);
  services.provide("selection", new SelectionService());
  services.provide("theme", new ThemeService());

  return createRuntime<IHooks, IRuntimeConfig>({
    config,
    hooks: createHooks(),
    plugins: [createGridPlugin()],
    services,
    boot: async ({ services, hooks }) => {
      services.require("render").start();
      services.require("camera").start();
      hooks.init.call();
      await hooks.initAsync.promise();
    },
    shutdown: async ({ services, hooks }) => {
      hooks.destroy.call();
      services.require("camera").stop();
      services.require("render").stop();
    },
  })
}
