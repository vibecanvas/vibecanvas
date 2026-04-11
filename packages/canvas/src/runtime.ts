import type { DocHandle } from "@automerge/automerge-repo";
import { createRuntime, createServiceRegistry } from "@vibecanvas/runtime";
import type { TCanvasDoc } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { TCloneImage, TDeleteImage, TFileCapability, TFiletreeCapability, TTerminalCapability, TUploadImage } from "./services/canvas/interface";
import type Konva from "konva";
import type { SetStoreFunction } from 'solid-js/store';
import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { AsyncParallelHook, SyncExitHook, SyncHook } from "@vibecanvas/tapable"
import type { TCustomEvent } from "./custom-events";
import { EditorService } from "./new-services/editor/EditorService";
import { KonvaService } from "./new-services/konva/KonvaService";
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
  /**
   * Called when the canvas is resized.
   */
  resize: SyncHook<[number, number]>;
  pointerDown: SyncHook<[TPointerEvent]>;
  pointerUp: SyncHook<[TPointerEvent]>;
  pointerOut: SyncHook<[TPointerEvent]>;
  pointerOver: SyncHook<[TPointerEvent]>;
  pointerMove: SyncHook<[TMouseEvent]>;
  pointerWheel: SyncHook<[TWheelEvent]>;
  pointerCancel: SyncHook<[TPointerEvent]>;
  keydown: SyncHook<[KeyboardEvent]>;
  keyup: SyncHook<[KeyboardEvent]>;
  cameraChange: SyncHook<[]>;
  customEvent: SyncExitHook<TCustomEvent>;
}

declare module "@vibecanvas/runtime" {
  interface IServiceMap {
    editor: EditorService;
    konva: KonvaService;
    selection: SelectionService;
    theme: ThemeService;
  }
}

export function buildRuntime(config: IRuntimeConfig) {
  const services = createServiceRegistry();
  services.provide("editor", new EditorService());
  services.provide("konva", new KonvaService({
    container: config.container,
    docHandle: config.docHandle,
  }));
  services.provide("selection", new SelectionService());
  services.provide("theme", new ThemeService());

  return createRuntime({
    config,
    hooks: [],
    plugins: [],
    services,
  })
}
