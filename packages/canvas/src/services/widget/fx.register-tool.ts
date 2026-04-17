import type { ThemeService } from "@vibecanvas/service-theme";
import type Konva from "konva";
import type { EditorService } from "../editor/EditorService";
import type { IWidgetConfig } from "./interface";
import { fxDrawHost, fxUpdateHost } from "./fx.draw-host";

type TPortalRegisterWidgetTool = {
  editorService: EditorService;
  konva: typeof Konva;
  themeService: ThemeService;
}

type TArgsRegisterWidgetTool = {
  widgetConfig: IWidgetConfig;
}

export function fxRegisterWidgetTool(portal: TPortalRegisterWidgetTool, args: TArgsRegisterWidgetTool) {
  if (!args.widgetConfig.tool) return

  portal.editorService.registerTool({
    id: args.widgetConfig.id,
    label: args.widgetConfig.tool.label,
    icon: args.widgetConfig.tool.icon,
    shortcuts: args.widgetConfig.tool.shortcuts,
    group: args.widgetConfig.tool.group,
    priority: args.widgetConfig.tool.priority,
    behavior: { type: 'mode', mode: 'draw-create' },
    drawCreate: {
      startDraft(localArgs) {
        return fxDrawHost({ konva: portal.konva, themeService: portal.themeService },
          { ...localArgs, kind: args.widgetConfig.id, initialPayload: args.widgetConfig.initialPayload ?? {} })
      },
      updateDraft(previewNode, localArgs) {
        if (!(previewNode instanceof portal.konva.Group)) return

        fxUpdateHost({ konva: portal.konva, group: previewNode, themeService: portal.themeService }, localArgs)
      },
    },
  })
}
