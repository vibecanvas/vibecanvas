import { CanvasMode, Theme } from 'src/services/canvas/enum';
import { AsyncParallelHook, SyncHook, SyncWaterfallHook } from '../tapable';
import type Konva from "konva";
import { ICanvasConfig } from 'src/services/canvas/interface';
import { Camera } from 'src/services/canvas/Camera';

export type TPointerEvent = Konva.KonvaEventObject<MouseEvent | TouchEvent | PointerEvent>;
export type TWheelEvent = Konva.KonvaEventObject<WheelEvent>;
export type TKeyboardEvent = KeyboardEvent;
export type TInputHandlerResult = boolean | void;

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
  pointerMove: SyncHook<[TPointerEvent]>;
  pointerOut: SyncHook<[TPointerEvent]>;
  pointerOver: SyncHook<[TPointerEvent]>;
  pointerWheel: SyncHook<[TWheelEvent]>;
  pointerCancel: SyncHook<[TPointerEvent]>;
  cameraChange: SyncHook<[]>;
  modeChange: SyncHook<[CanvasMode, CanvasMode]>;
}


export interface IPluginContext extends ICanvasConfig {
  hooks: IHooks;
  staticLayer: Konva.Layer;
  dynamicLayer: Konva.Layer;
  camera: Camera;
  api: {
    getCanvasMode(): CanvasMode;
    getTheme(): Theme;
  };
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
