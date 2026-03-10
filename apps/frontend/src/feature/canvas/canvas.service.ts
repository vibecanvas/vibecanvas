import { World } from "@lastolivegames/becsy"
import { RenderEngine } from "./engine/engine";
import { ToolSystem } from "./ecs/systems/ToolSystem";
import { Tool } from "./ecs/components/Tool";

export class CanvasService {
  #instancePromise!: Promise<this>;
  #world!: World;
  #engine!: RenderEngine;
  #animationFrame!: number;

  constructor(canvasRef: HTMLCanvasElement) {
    this.#instancePromise = (async () => {
      this.#world = await World.create({
        defs: [Tool, ToolSystem]
      });
      this.#engine = new RenderEngine(canvasRef);
      this.run()
      return this;
    })();
  }

  get initialized() {
    return this.#instancePromise.then(() => this);
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