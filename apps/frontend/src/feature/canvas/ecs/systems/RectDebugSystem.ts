import { system, System } from "@lastolivegames/becsy";
import { PointerFrame } from "../components/PointerFrame";
import { Tool } from "../components/Tool";
import { PointerEventSystem } from "./PointerEventSystem";

@system(s => s.after(PointerEventSystem))
export class RectDebugSystem extends System {
  private frame = this.singleton.read(PointerFrame);
  private tool = this.singleton.read(Tool);

  execute(): void {
    if (this.tool.activeTool !== "rectangle") {
      return;
    }
  }
}
