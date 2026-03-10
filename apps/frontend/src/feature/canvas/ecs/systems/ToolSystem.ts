import { system, System } from "@lastolivegames/becsy";
import { Tool } from "../components/Tool";


export class ToolSystem extends System {
  private tool = this.singleton.write(Tool);
  initialize(): void {
    console.log(`initialize`)
  }
  execute(): void {
  }
}