import { system, System } from "@lastolivegames/becsy";
import { Tool } from "../components/Tool";
import { canvasStore, setCanvasStore } from "../../canvas.store";
import type { Tool as CanvasTool } from "../../components/floating-canvas-toolbar/toolbar.types";

type TToolBridge = {
  consumeQueuedActiveTool: () => CanvasTool | null;
};


export class ToolSystem extends System {
  bridge!: TToolBridge;
  private tool = this.singleton.write(Tool);

  execute(): void {
    const nextTool = this.bridge.consumeQueuedActiveTool();

    if (nextTool !== null && this.tool.activeTool !== nextTool) {
      this.tool.activeTool = nextTool;
    }

    if (canvasStore.activeTool !== this.tool.activeTool) {
      setCanvasStore("activeTool", this.tool.activeTool as typeof canvasStore.activeTool);
    }
  }
}
