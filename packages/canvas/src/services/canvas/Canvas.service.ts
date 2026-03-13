import Konva from "konva";
import { ICanvasConfig } from "./interface";
import { Camera } from "./Camera";
import { IPluginContext, TKeyboardEvent, TMouseEvent, TPointerEvent, TWheelEvent } from "../../plugins/interface";
import { CanvasMode, Theme } from "./enum";
import { AsyncParallelHook, SyncHook } from "../../tapable";
import { GridPlugin } from "../../plugins/Grid.plugin";
import { EventListenerPlugin } from "../../plugins/EventListener.plugin";
import { CameraControlPlugin } from "../../plugins/CameraControl.plugin";


export class CanvasService {
  #config: ICanvasConfig;
  #stage: Konva.Stage;
  #staticLayer: Konva.Layer;
  #dynamicLayer: Konva.Layer;
  #camera: Camera;
  #instancePromise: Promise<this>;
  #pluginContext: IPluginContext;
  #mode: CanvasMode = CanvasMode.SELECT;
  #theme: Theme = Theme.LIGHT;

  constructor(config: ICanvasConfig, container: HTMLDivElement) {
    this.#config = config;
    this.#stage = new Konva.Stage({
      container,
      width: container.clientWidth,
      height: container.clientHeight,
    });

    this.#staticLayer = new Konva.Layer({ draggable: false });
    this.#dynamicLayer = new Konva.Layer();
    this.#camera = new Camera(this.#dynamicLayer);
    this.#stage.add(this.#staticLayer);
    this.#stage.add(this.#dynamicLayer);

    const rect1 = new Konva.Rect({
      x: 60,
      y: 60,
      width: 100,
      height: 90,
      fill: 'red',
      name: 'rect',
      draggable: true,
    });

    const rect2 = new Konva.Rect({
      x: 220,
      y: 140,
      width: 100,
      height: 90,
      fill: "blue",
      name: "rect",
      draggable: true,
    });

    this.#dynamicLayer.add(rect1);
    this.#dynamicLayer.add(rect2);

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
        keydown: new SyncHook<TKeyboardEvent>(),
        keyup: new SyncHook<TKeyboardEvent>(),
        modeChange: new SyncHook<[CanvasMode, CanvasMode]>(),
      },
      staticLayer: this.#staticLayer,
      dynamicLayer: this.#dynamicLayer,
      stage: this.#stage,
      camera: this.#camera,
      api: {
        getCanvasMode: () => this.#mode,
        getTheme: () => this.#theme,
      }
    }

    const plugins = [
      new EventListenerPlugin(),
      new GridPlugin(),
      new CameraControlPlugin(),
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

  }

  get initialized() {
    return this.#instancePromise.then(() => this);
  }

  destroy() {
    this.#stage.destroy();
  }

} 
