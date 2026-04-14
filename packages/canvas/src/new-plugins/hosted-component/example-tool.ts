import type { TEditorTool, WidgetService } from "../../new-services";

export const exampleTool: TEditorTool = {
  behavior: { type: 'mode', mode: 'click-create' },
  id: 'example',
  label: 'example',
  priority: 1000,
};


export function setupExampleTool(widget: WidgetService) {
  widget.registerWidget({
    tool: exampleTool,

  });
}
