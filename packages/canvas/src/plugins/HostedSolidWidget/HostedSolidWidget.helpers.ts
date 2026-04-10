import type { TFileData, TFiletreeData, TTerminalData } from "@vibecanvas/service-automerge/types/canvas-doc";
import { getFileName, getFileRenderer } from "../../components/file/utils";
import type { IPluginContext } from "../shared/interface";
import { FILETREE_CHAT_DND_MIME, HOSTED_TYPES, TOOL_TO_WIDGET_TYPE } from "./HostedSolidWidget.constants";
import type { TDroppedNode, THostedWidgetElement, THostedWidgetTool, THostedWidgetType } from "./HostedSolidWidget.types";

export type TWorldViewportBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type THostedWidgetFactoryRuntime = {
  now: () => number;
  randomUUID: () => string;
  getFileRenderer: typeof getFileRenderer;
};

const defaultFactoryRuntime: THostedWidgetFactoryRuntime = {
  now: () => Date.now(),
  randomUUID: () => crypto.randomUUID(),
  getFileRenderer,
};

export function isHostedType(type: string): type is THostedWidgetType {
  return HOSTED_TYPES.has(type as THostedWidgetType);
}

export function getWidgetTypeFromTool(tool: THostedWidgetTool) {
  return TOOL_TO_WIDGET_TYPE[tool] ?? null;
}

export function screenToWorld(context: IPluginContext, point: { x: number; y: number }) {
  const containerRect = context.stage.container().getBoundingClientRect();
  const inverted = context.staticForegroundLayer.getAbsoluteTransform().copy().invert();
  return inverted.point({
    x: point.x - containerRect.left,
    y: point.y - containerRect.top,
  });
}

export function parseDroppedNode(event: DragEvent): TDroppedNode | null {
  const raw = event.dataTransfer?.getData(FILETREE_CHAT_DND_MIME);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<TDroppedNode>;
    if (typeof parsed.path !== "string") return null;
    if (typeof parsed.name !== "string") return null;
    if (typeof parsed.is_dir !== "boolean") return null;
    return parsed as TDroppedNode;
  } catch {
    return null;
  }
}

export function toShellEscapedPathText(path: string): string {
  return `'${path.replaceAll("'", `'\\''`)}' `;
}

export function createFileElement(
  runtime: THostedWidgetFactoryRuntime = defaultFactoryRuntime,
  payload: { id?: string; x: number; y: number; path: string },
): THostedWidgetElement {
  const now = runtime.now();
  return {
    id: payload.id ?? runtime.randomUUID(),
    x: payload.x,
    y: payload.y,
    rotation: 0,
    zIndex: "",
    parentGroupId: null,
    bindings: [],
    locked: false,
    createdAt: now,
    updatedAt: now,
    style: {
      backgroundColor: "#f8fafc",
      borderColor: "#cbd5e1",
      headerColor: "#e2e8f0",
      opacity: 1,
    },
    data: {
      type: "file",
      w: 560,
      h: 500,
      path: payload.path,
      renderer: runtime.getFileRenderer(payload.path),
      isCollapsed: false,
    } satisfies TFileData,
  };
}

export function createFileElementFromDrop(
  runtime: THostedWidgetFactoryRuntime = defaultFactoryRuntime,
  payload: { id?: string; x: number; y: number; path: string },
): THostedWidgetElement {
  return createFileElement(runtime, {
    id: payload.id,
    x: payload.x - 280,
    y: payload.y - 250,
    path: payload.path,
  });
}

export function getViewportWorldBounds(context: IPluginContext): TWorldViewportBounds {
  const topLeft = screenToWorld(context, { x: 0, y: 0 });
  const bottomRight = screenToWorld(context, {
    x: context.stage.width(),
    y: context.stage.height(),
  });

  const left = Math.min(topLeft.x, bottomRight.x);
  const right = Math.max(topLeft.x, bottomRight.x);
  const top = Math.min(topLeft.y, bottomRight.y);
  const bottom = Math.max(topLeft.y, bottomRight.y);

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

export function getHostedFilePreviewPosition(
  anchor: { x: number; y: number; width: number; height: number },
  viewport: TWorldViewportBounds,
  panel: { width: number; height: number },
  layout: { gap?: number; padding?: number } = {},
) {
  const gap = layout.gap ?? 24;
  const padding = layout.padding ?? 24;
  const rightX = anchor.x + anchor.width + gap;
  const leftX = anchor.x - panel.width - gap;
  const minX = viewport.left + padding;
  const maxX = Math.max(minX, viewport.right - padding - panel.width);
  const minY = viewport.top + padding;
  const maxY = Math.max(minY, viewport.bottom - padding - panel.height);
  const fitsRight = rightX + panel.width <= viewport.right - padding;
  const fitsLeft = leftX >= minX;

  const x = fitsRight ? rightX : fitsLeft ? leftX : Math.min(Math.max(rightX, minX), maxX);
  const y = Math.min(Math.max(anchor.y, minY), maxY);

  return { x, y };
}

export function getWidgetHeaderLabel(element: THostedWidgetElement) {
  if (element.data.type === "terminal") return "untitled";
  if (element.data.type === "filetree") return "files";
  if (element.data.type === "file") return getFileName(element.data.path);
  return "widget";
}

export function getDefaultWidgetChrome(element: THostedWidgetElement) {
  return {
    title: getWidgetHeaderLabel(element),
    subtitle: element.data.type === "terminal" ? "interactive terminal" : null,
  };
}

export function getDefaultWidgetElement(
  runtime: THostedWidgetFactoryRuntime = defaultFactoryRuntime,
  payload: { type: THostedWidgetType; x: number; y: number; id?: string; path?: string },
): THostedWidgetElement {
  const id = payload.id ?? runtime.randomUUID();
  const now = runtime.now();

  if (payload.type === "filetree") {
    return {
      id,
      x: payload.x,
      y: payload.y,
      rotation: 0,
      zIndex: "",
      parentGroupId: null,
      bindings: [],
      locked: false,
      createdAt: now,
      updatedAt: now,
      style: {
        backgroundColor: "#f8fafc",
        borderColor: "#cbd5e1",
        headerColor: "#dcfce7",
        opacity: 1,
      },
      data: {
        type: "filetree",
        w: 360,
        h: 460,
        isCollapsed: false,
        path: payload.path ?? "",
      } satisfies TFiletreeData,
    };
  }

  if (payload.type === "file") {
    return createFileElementFromDrop(runtime, { id, x: payload.x, y: payload.y, path: "untitled.txt" });
  }

  return {
    id,
    x: payload.x,
    y: payload.y,
    rotation: 0,
    zIndex: "",
    parentGroupId: null,
    bindings: [],
    locked: false,
    createdAt: now,
    updatedAt: now,
    style: {
      backgroundColor: "#111827",
      borderColor: "#0f172a",
      headerColor: "#1f2937",
      opacity: 1,
    },
    data: {
      type: "terminal",
      w: 460,
      h: 300,
      isCollapsed: false,
      workingDirectory: ".",
    } satisfies TTerminalData,
  };
}
