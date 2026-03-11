import { World } from "@lastolivegames/becsy"
import { PointerContact } from "./ecs/components/PointerContact";
import { ToolSystem } from "./ecs/systems/ToolSystem";
import { Tool } from "./ecs/components/Tool";
import type { Tool as CanvasTool } from "./components/floating-canvas-toolbar/toolbar.types";
import { FabricRenderSystem } from "./ecs/systems/FabricRenderSystem";
import { PixiRenderSystem } from "./ecs/systems/PixiRenderSystem";
import { KonvaRenderSystem } from "./ecs/systems/KonvaRenderSystem";
import { DEFAULT_CANVAS_RENDERER, type CanvasRenderer } from "./renderer.types";
import { PixiEventSystem } from "./ecs/systems/PixiEventSystem";

type TCanvasServiceOptions = {
  renderer?: CanvasRenderer;
};

export class CanvasService {
  #instancePromise!: Promise<this>;
  #world!: World;
  // #engine!: RenderEngine;
  #animationFrame!: number;
  #pendingActiveTool: CanvasTool | null = null;


  constructor(hostRef: HTMLDivElement, options: TCanvasServiceOptions = {}) {
    this.#instancePromise = (async () => {
      this.#world = await World.create({
        defs: [
          Tool,
          PointerContact,
          ToolSystem, { bridge: this },
          PixiRenderSystem, { hostRef },
          PixiEventSystem
        ]
      });
      this.run()
      return this;
    })();
  }

  get initialized() {
    return this.#instancePromise.then(() => this);
  }

  queueActiveTool(tool: CanvasTool): void {
    this.#pendingActiveTool = tool;
  }

  consumeQueuedActiveTool(): CanvasTool | null {
    const tool = this.#pendingActiveTool;
    this.#pendingActiveTool = null;
    return tool;
  }

  async run() {
    // Run all the systems
    await this.#world.execute();
    this.#animationFrame = requestAnimationFrame(this.run.bind(this));
  }

  destroy(): void {
    cancelAnimationFrame(this.#animationFrame);
    this.#world.terminate();
    // this.#engine?.destroy();
  }

}
