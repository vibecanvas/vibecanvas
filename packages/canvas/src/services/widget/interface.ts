import type { ThemeService } from "@vibecanvas/service-theme";
import type { SyncHook } from "@vibecanvas/tapable";
import type { ContextMenuService } from "../context-menu/ContextMenuService";
import type { CrdtService } from "../crdt/CrdtService";
import type { EditorService, TEditorTool } from "../editor/EditorService";
import type { LoggingService } from "../logging/LoggingService";


export interface IWidgetManagerServiceHooks {
  widgetChange: SyncHook<[]>;
}

export interface IWidgetManagerServiceProps {
  crdtService: CrdtService;
  contextMenuService: ContextMenuService;
  loggingService: LoggingService;
  editorService: EditorService;
  themeService: ThemeService;
}

export interface IWidgetConfig {
  id: string;
  tool?: Pick<TEditorTool, "group" | "icon" | "label" | "priority" | "shortcuts" >



}
