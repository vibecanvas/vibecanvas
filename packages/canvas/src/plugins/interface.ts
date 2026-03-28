import type Konva from "konva";
import type { SetStoreFunction } from 'solid-js/store';
import type { TCustomEvent } from '../custom-events';
import type { Camera } from '../services/canvas/Camera';
import type { History } from "../services/canvas/History";
import type { IState, TCloneImage, TDeleteImage, THostedWidgetRenderers, TUploadImage } from '../services/canvas/interface';
import type { AsyncParallelHook, SyncExitHook, SyncHook } from '../tapable';
import type { Crdt } from "../services/canvas/Crdt";
import type { TElement, TGroup } from "@vibecanvas/shell/automerge/index";

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

export interface IPluginContext {
  hooks: IHooks;
  staticBackgroundLayer: Konva.Layer;
  staticForegroundLayer: Konva.Layer;
  dynamicLayer: Konva.Layer;
  stage: Konva.Stage;
  worldWidgetsRoot: HTMLDivElement;
  camera: Camera;
  state: IState;
  setState: SetStoreFunction<IState>;
  history: History;
  crdt: Crdt;
  capabilities: {
    createShapeFromTElement?: (element: TElement) => Konva.Shape | null;
    updateShapeFromTElement?: (element: TElement) => Konva.Shape | null;
    createGroupFromTGroup?: (element: TGroup) => Konva.Group | null;
    toElement?: (node: Konva.Shape) => TElement | null;
    toGroup?: (node: Konva.Group) => TGroup | null;
    getReorderBundle?: (node: Konva.Group | Konva.Shape) => Array<Konva.Group | Konva.Shape>;
    uploadImage?: TUploadImage;
     cloneImage?: TCloneImage;
     deleteImage?: TDeleteImage;
     widgetRenderers?: THostedWidgetRenderers;
     notification?: {
       showSuccess(title: string, description?: string): void;
       showError(title: string, description?: string): void;
       showInfo(title: string, description?: string): void;
     };
     hostedWidgets?: {
       isHostedNode: (node: Konva.Node | null | undefined) => boolean;
       syncNode: (node: Konva.Shape) => void;
       removeNode: (id: string) => void;
       syncDomOrder: () => void;
     };
     renderOrder?: {
      getNodeZIndex: (node: Konva.Group | Konva.Shape) => string;
      setNodeZIndex: (node: Konva.Group | Konva.Shape, zIndex: string) => void;
      getOrderBundle: (node: Konva.Group | Konva.Shape) => Array<Konva.Group | Konva.Shape>;
      getOrderedSiblings: (parent: Konva.Layer | Konva.Group) => Array<Konva.Group | Konva.Shape>;
      sortChildren: (parent: Konva.Layer | Konva.Group) => void;
      assignOrderOnInsert: (args: {
        parent: Konva.Layer | Konva.Group;
        nodes: Array<Konva.Group | Konva.Shape>;
        position?: "front" | "back" | { beforeId?: string; afterId?: string };
      }) => Array<TElement | TGroup>;
      moveSelectionUp: (nodes: Array<Konva.Group | Konva.Shape>) => void;
      moveSelectionDown: (nodes: Array<Konva.Group | Konva.Shape>) => void;
      bringSelectionToFront: (nodes: Array<Konva.Group | Konva.Shape>) => void;
      sendSelectionToBack: (nodes: Array<Konva.Group | Konva.Shape>) => void;
      snapshotParentOrder: (parent: Konva.Layer | Konva.Group) => TRenderOrderSnapshot;
      restoreParentOrder: (snapshot: TRenderOrderSnapshot) => void;
    };
  }

}

/**
 * Inspired by Webpack plugin system.
 */
export interface IPlugin {
  /**
   * Get called when the plugin is installed.
   */
  apply: (context: IPluginContext) => void;
}
