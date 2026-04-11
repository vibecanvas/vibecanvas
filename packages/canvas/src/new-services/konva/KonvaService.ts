import type { DocHandle } from "@automerge/automerge-repo";
import type { IService, IStartableService, IStoppableService } from "@vibecanvas/runtime";
import type { TCanvasDoc } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import Konva from "konva";

export type TKonvaServiceArgs = {
  container: HTMLDivElement;
  docHandle: DocHandle<TCanvasDoc>;
};

export class KonvaService implements IService, IStartableService, IStoppableService {
  readonly name = "konva";

  readonly container: HTMLDivElement;
  readonly docHandle: DocHandle<TCanvasDoc>;

  stage!: Konva.Stage;
  staticBackgroundLayer!: Konva.Layer;
  staticForegroundLayer!: Konva.Layer;
  dynamicLayer!: Konva.Layer;
  resizeObserver!: ResizeObserver;

  started = false;

  constructor(args: TKonvaServiceArgs) {
    this.container = args.container;
    this.docHandle = args.docHandle;
  }

  start(): void | Promise<void> {
    if (this.started) {
      return;
    }

    this.stage = this.#createStage();

    const layers = this.#createLayers();
    this.staticBackgroundLayer = layers.staticBackgroundLayer;
    this.staticForegroundLayer = layers.staticForegroundLayer;
    this.dynamicLayer = layers.dynamicLayer;

    this.#attachLayers();
    this.resizeObserver = this.#createResizeObserver();
    this.resizeObserver.observe(this.container);
    this.started = true;
  }

  stop(): void | Promise<void> {
    if (!this.started) {
      return;
    }

    this.resizeObserver.disconnect();
    this.stage.destroy();
    this.started = false;
  }

  #createStage() {
    return new Konva.Stage({
      container: this.container,
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    });
  }

  #createLayers() {
    return {
      staticBackgroundLayer: new Konva.Layer(),
      staticForegroundLayer: new Konva.Layer(),
      dynamicLayer: new Konva.Layer(),
    };
  }

  #attachLayers() {
    this.stage.add(this.staticBackgroundLayer);
    this.stage.add(this.staticForegroundLayer);
    this.stage.add(this.dynamicLayer);
  }

  #createResizeObserver() {
    return new ResizeObserver(() => {
      this.#resizeStageToContainer();
    });
  }

  #resizeStageToContainer() {
    this.stage.size({
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    });
    this.stage.batchDraw();
  }
}
