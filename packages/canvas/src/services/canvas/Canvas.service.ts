import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import type { Group } from "konva/lib/Group";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import { createStore, SetStoreFunction } from 'solid-js/store';
import type { TCustomEvent } from "../../custom-events";
import {
  CameraControlPlugin, ContextMenuPlugin, EventListenerPlugin, ExampleScenePlugin,
  GridPlugin, GroupPlugin, HelpPlugin, HistoryControlPlugin, ImagePlugin, PenPlugin, RecorderPlugin, RenderOrderPlugin, SceneHydratorPlugin,
  SelectPlugin, SelectionStyleMenuPlugin, Shape2dPlugin, TextPlugin, ToolbarPlugin, TransformPlugin, VisualDebugPlugin
} from "../../plugins";
import type { IPlugin, IPluginContext, TMouseEvent, TPointerEvent, TWheelEvent } from "../../plugins/interface";
import { AsyncParallelHook, SyncExitHook, SyncHook } from "../../tapable";
import { Camera } from "./Camera";
import { Crdt } from "./Crdt";
import { CanvasMode, Theme } from "./enum";
import type { IState } from "./interface";
import { History } from "./History";

export function defaultPlugins(
  args: { onToggleSidebar: () => void }
): IPlugin[] {
  const groupPlugin = new GroupPlugin();
  const plugins = [
    new EventListenerPlugin(),
    new GridPlugin(),
    new VisualDebugPlugin(),
    new CameraControlPlugin(),
    new HistoryControlPlugin(),
    new ToolbarPlugin(args.onToggleSidebar),
    new SelectionStyleMenuPlugin(),
    new HelpPlugin(),
    new RecorderPlugin(),
    new RenderOrderPlugin(),
    new SelectPlugin(),
    new TransformPlugin(),
    new Shape2dPlugin(),
    new PenPlugin(),
    new TextPlugin(),
    new ImagePlugin(),
    groupPlugin,
    new ContextMenuPlugin(),
    // new ExampleScenePlugin(groupPlugin)
    new SceneHydratorPlugin()
  ];

  return plugins
}

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
  #crdt: Crdt;
  #history: History;

  constructor(
    container: HTMLDivElement,
    docHandle: DocHandle<TCanvasDoc>,
    plugins: IPlugin[],
    appCapabilities: Pick<IPluginContext["capabilities"], "uploadImage" | "cloneImage" | "deleteImage" | "notification"> = {},
  ) {
    this.#history = new History();
    this.#crdt = new Crdt(docHandle);
    this.#stage = new Konva.Stage({
      container,
      width: container.clientWidth,
      height: container.clientHeight,
    });
    // @ts-ignore
    window.stage = this.#stage
    // @ts-ignore
    window.canvas = this

    const [state, setState] = createStore({
      mode: CanvasMode.SELECT,
      theme: Theme.LIGHT,
      selection: [] as (Group | Shape<ShapeConfig>)[],
      editingTextId: null as string | null,
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
        customEvent: new SyncExitHook<TCustomEvent>(),
      },
      staticBackgroundLayer: this.#staticBackgroundLayer,
      staticForegroundLayer: this.#staticForegroundLayer,
      dynamicLayer: this.#dynamicLayer,
      stage: this.#stage,
      camera: this.#camera,
      state: this.#state,
      setState: this.#setState,
      history: this.#history,
      crdt: this.#crdt,
      capabilities: {
        uploadImage: appCapabilities.uploadImage,
        cloneImage: appCapabilities.cloneImage,
        deleteImage: appCapabilities.deleteImage,
        notification: appCapabilities.notification,
      }
    }

    this.#instancePromise = (async () => {
      // @ts-expect-error is assigned in constructor
      const { hooks } = this.#pluginContext;
      plugins.forEach((plugin) => {
        plugin.apply(this.#pluginContext);
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
