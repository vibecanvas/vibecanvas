import type Konva from "konva";
import type { SetStoreFunction } from 'solid-js/store';
import type { Camera } from 'src/services/canvas/Camera';
import type { CanvasMode } from 'src/services/canvas/enum';
import type { IState } from 'src/services/canvas/interface';
import type { TCustomEvent } from '../custom-events';
import { AsyncParallelHook, SyncExitHook, SyncHook } from '../tapable';

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
  camera: Camera;
  state: IState;
  setState: SetStoreFunction<IState>;

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
