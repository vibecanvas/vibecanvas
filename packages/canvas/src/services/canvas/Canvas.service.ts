import Konva from "konva";
import { Group } from "konva/lib/Group";
import { Shape, ShapeConfig } from "konva/lib/Shape";
import { createStore, SetStoreFunction } from 'solid-js/store';
import type { TCustomEvent } from "../../custom-events";
import { CameraControlPlugin } from "../../plugins/CameraControl.plugin";
import { EventListenerPlugin } from "../../plugins/EventListener.plugin";
import { ExampleScenePlugin } from "../../plugins/ExampleScene.plugin";
import { GridPlugin } from "../../plugins/Grid.plugin";
import type { IPluginContext, TMouseEvent, TPointerEvent, TWheelEvent } from "../../plugins/interface";
import { SelectPlugin } from "../../plugins/Select.plugin";
import { ToolbarPlugin } from "../../plugins/Toolbar.plugin";
import { TransformPlugin } from "../../plugins/Transform.plugin";
import { AsyncParallelHook, SyncExitHook, SyncHook } from "../../tapable";
import { Camera } from "./Camera";
import { CanvasMode, Theme } from "./enum";
import type { IState } from "./interface";
import { createEffect } from "solid-js";


export class CanvasService {
  #stage: Konva.Stage;
  #staticBackgroundLayer: Konva.Layer;
  #staticForegroundLayer: Konva.Layer;
  #dynamicLayer: Konva.Layer;
  #camera: Camera;
  #instancePromise: Promise<this>;
  #pluginContext: IPluginContext;
  #resizeObserver: ResizeObserver;
  #state: IState;
  #setState: SetStoreFunction<IState>;

  constructor(container: HTMLDivElement, onToggleSidebar: () => void) {
    this.#stage = new Konva.Stage({
      container,
      width: container.clientWidth,
      height: container.clientHeight,
    });

    const [state, setState] = createStore({
      mode: CanvasMode.SELECT,
      theme: Theme.LIGHT,
      selection: [] as (Group | Shape<ShapeConfig>)[],
    });
    this.#state = state;
    this.#setState = setState;


    this.#staticBackgroundLayer = new Konva.Layer();
    this.#staticForegroundLayer = new Konva.Layer();
    this.#dynamicLayer = new Konva.Layer();
    this.#camera = new Camera({ dynamicLayer: this.#dynamicLayer, staticForegroundLayer: this.#staticForegroundLayer });
    this.#stage.add(this.#staticBackgroundLayer);
    this.#stage.add(this.#staticForegroundLayer);
    this.#stage.add(this.#dynamicLayer);

    this.#pluginContext = {
      hooks: {
        init: new SyncHook(),
        initAsync: new AsyncParallelHook(),
        cameraChange: new SyncHook(),
        destroy: new SyncHook(),
        resize: new SyncHook(),
        pointerDown: new SyncHook<TPointerEvent>(),
        pointerUp: new SyncHook<TPointerEvent>(),
        pointerMove: new SyncHook<TMouseEvent>(),
        pointerOut: new SyncHook<TPointerEvent>(),
        pointerOver: new SyncHook<TPointerEvent>(),
        pointerCancel: new SyncHook<TPointerEvent>(),
        pointerWheel: new SyncHook<TWheelEvent>(),
        keydown: new SyncHook<KeyboardEvent>(),
        keyup: new SyncHook<KeyboardEvent>(),
        modeChange: new SyncHook<[CanvasMode, CanvasMode]>(),
        customEvent: new SyncExitHook<TCustomEvent>()
      },
      staticBackgroundLayer: this.#staticBackgroundLayer,
      staticForegroundLayer: this.#staticForegroundLayer,
      dynamicLayer: this.#dynamicLayer,
      stage: this.#stage,
      camera: this.#camera,
      state: this.#state,
      setState: this.#setState,
    }

    const plugins = [
      new EventListenerPlugin(),
      new GridPlugin(),
      new CameraControlPlugin(),
      new ToolbarPlugin(onToggleSidebar),
      new SelectPlugin(),
      new TransformPlugin(),
      new ExampleScenePlugin()
    ];

    this.#instancePromise = (async () => {
      // @ts-expect-error is assigned in constructor
      const { hooks } = this.#pluginContext;
      plugins.forEach((plugin) => {
        plugin?.apply(this.#pluginContext);
      });
      hooks.init.call();
      await hooks.initAsync.promise();
      return this;
    })();

    this.#resizeObserver = new ResizeObserver(() => {
      this.#stage.size({
        width: this.#stage.container().clientWidth,
        height: this.#stage.container().clientHeight,
      });
      this.#stage.batchDraw();
      this.#pluginContext.hooks.cameraChange.call();
    });

    this.#resizeObserver.observe(container);


  }

  get initialized() {
    return this.#instancePromise.then(() => this);
  }

  destroy() {
    this.#stage.destroy();
    this.#resizeObserver.disconnect();
    this.#pluginContext.hooks.destroy.call();
  }

} 
