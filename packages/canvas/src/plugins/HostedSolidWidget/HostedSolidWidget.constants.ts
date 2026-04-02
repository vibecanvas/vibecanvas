import type { THostedWidgetTool, THostedWidgetType } from "./HostedSolidWidget.types";

export const HOSTED_TYPES = new Set<THostedWidgetType>(["filetree", "terminal", "file"]);

export const TOOL_TO_WIDGET_TYPE: Partial<Record<THostedWidgetTool, THostedWidgetType>> = {
  filesystem: "filetree",
  terminal: "terminal",
};

export const HOSTED_TYPE_ATTR = "vcHostedWidgetType";
export const HOSTED_ELEMENT_ATTR = "vcHostedElementSnapshot";
export const HOSTED_WIDGET_CLASS = "vc-hosted-widget";
export const LAST_FILETREE_PATH_KEY = "vibecanvas-filetree-last-path";
export const FILETREE_CHAT_DND_MIME = "application/x-vibecanvas-filetree-node";
