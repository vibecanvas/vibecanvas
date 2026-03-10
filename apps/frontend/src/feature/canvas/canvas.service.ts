import { World } from "@lastolivegames/becsy"
import { RenderEngine } from "./engine/engine";
import { PointerContact } from "./ecs/components/PointerContact";
import { PointerFrame } from "./ecs/components/PointerFrame";
import { RectDebugSystem } from "./ecs/systems/RectDebugSystem";
import { ToolSystem } from "./ecs/systems/ToolSystem";
import { PointerEventSystem } from "./ecs/systems/PointerEventSystem";
import { Tool } from "./ecs/components/Tool";
import type { Tool as CanvasTool } from "./components/floating-canvas-toolbar/toolbar.types";
import type { TCanvasPointerInput } from "./input/pointer.types";

export class CanvasService {
  #instancePromise!: Promise<this>;
  #world!: World;
  #engine!: RenderEngine;
  #animationFrame!: number;
  #pendingActiveTool: CanvasTool | null = null;
  #pointerInputs: TCanvasPointerInput[] = [];
  #handlePointerCancel: (event: PointerEvent) => void;

  constructor(canvasRef: HTMLCanvasElement) {
    this.#handlePointerCancel = (event) => {
      this.queuePointerInput({
        phase: "cancel",
        pointerId: event.pointerId,
        pointerType: event.pointerType === "touch" || event.pointerType === "pen" ? event.pointerType : "mouse",
        isPrimary: event.isPrimary,
        button: event.button,
        buttons: event.buttons,
        pressure: event.pressure,
        clientX: event.clientX,
        clientY: event.clientY,
        canvasX: event.clientX,
        canvasY: event.clientY,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        timestamp: event.timeStamp,
      });
    };

    this.#instancePromise = (async () => {
      this.#world = await World.create({
        defs: [
          Tool,
          PointerContact,
          PointerFrame,
          ToolSystem,
          { bridge: this },
          PointerEventSystem,
          { bridge: this },
          RectDebugSystem,
        ]
      });
      this.#setupPointerEvents(canvasRef);
      this.#engine = new RenderEngine(canvasRef, (event) => {
        this.queuePointerInput(event);
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

  consumePointerInputs(): TCanvasPointerInput[] {
    const events = this.#pointerInputs;
    this.#pointerInputs = [];
    return events;
  }

  queuePointerInput(event: TCanvasPointerInput): void {
    this.#pointerInputs.push(event);
  }

  #setupPointerEvents(canvasRef: HTMLCanvasElement): void {
    canvasRef.style.touchAction = "none";
    window.addEventListener("pointercancel", this.#handlePointerCancel, true);
  }

  #teardownPointerEvents(): void {
    window.removeEventListener("pointercancel", this.#handlePointerCancel, true);
  }

  async run() {
    // Run all the systems
    await this.#world.execute();
    this.#animationFrame = requestAnimationFrame(this.run.bind(this));
  }

  destroy(): void {
    cancelAnimationFrame(this.#animationFrame);
    this.#teardownPointerEvents();
    this.#engine?.destroy();
  }


}
