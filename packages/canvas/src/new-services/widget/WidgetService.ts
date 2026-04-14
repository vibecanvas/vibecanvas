import { IService } from "@vibecanvas/runtime";
import { type EditorService } from "../editor/EditorService";

export class WidgetService implements IService<{}> {
  readonly name = "widget";

  constructor(private editor: EditorService) {

  }

  registerWidget() {}
}
