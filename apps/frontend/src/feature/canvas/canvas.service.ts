import { World } from "@lastolivegames/becsy"
import { RenderEngine } from "./engine/engine";
import { ToolSystem } from "./ecs/systems/ToolSystem";
import { Tool } from "./ecs/components/Tool";
import type { Tool as CanvasTool } from "./components/floating-canvas-toolbar/toolbar.types";

export class CanvasService {
  #instancePromise!: Promise<this>;
  #world!: World;
  #engine!: RenderEngine;
  #animationFrame!: number;
  #pendingActiveTool: CanvasTool | null = null;

  constructor(canvasRef: HTMLCanvasElement) {
    this.#instancePromise = (async () => {
      this.#world = await World.create({
        defs: [Tool, ToolSystem, { bridge: this }]
      });
      this.#engine = new RenderEngine(canvasRef);
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
    this.#engine?.destroy();
  }


}
