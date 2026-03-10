import { system, System } from "@lastolivegames/becsy";
import { Tool } from "../components/Tool";


@system export class SystemA extends System {
  private global = this.singleton.write(Tool);
  execute(): void {
    // this.global.state = 1;
  }
}