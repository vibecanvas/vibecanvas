import { IService } from "@vibecanvas/runtime";
import type { EditorService, TEditorTool} from "../editor/EditorService";

interface IWidget {
  tool: TEditorTool
}

export class WidgetService implements IService<{}> {
  readonly name = "widget";

  constructor(private editor: EditorService) {

  }

  registerWidget(widget: IWidget) {
    this.editor.registerTool(widget.tool);
    // this.editor.register
  }
}
