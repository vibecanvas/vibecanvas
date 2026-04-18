import type { ThemeService } from "@vibecanvas/service-theme";
import type { SyncHook } from "@vibecanvas/tapable";
import type { CanvasRegistryService, ContextMenuService, CrdtService, EditorService, LoggingService, SelectionService, TEditorTool } from "..";


export interface IWidgetManagerServiceHooks {
  widgetChange: SyncHook<[]>;
}

export interface IWidgetManagerServiceProps {
  crdtService: CrdtService;
  contextMenuService: ContextMenuService;
  loggingService: LoggingService;
  editorService: EditorService;
  themeService: ThemeService;
  canvasRegistryService: CanvasRegistryService;
  selectionService: SelectionService;
}

export interface IWidgetConfig {
  id: string;
  tool?: Pick<TEditorTool, "group" | "icon" | "label" | "priority" | "shortcuts" >
  initialPayload?: Record<string, any>;


}
