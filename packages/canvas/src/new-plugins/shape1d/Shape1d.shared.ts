import type { TArrowData, TElement, TElementStyle, TLineData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import Konva from "konva";
import { getWorldPosition } from "../../core/node-space";
import type { RenderService } from "../../new-services/render/RenderService";
import { resolveThemeColor, type ThemeService } from "@vibecanvas/service-theme";

export type TShape1dData = TLineData | TArrowData;
export type TShape1dTool = "line" | "arrow";
export type TPoint = [number, number];
export type TShape1dNode = Konva.Shape & {
  getSelfRect(): { x: number; y: number; width: number; height: number };
};
export type THandleDragSnapshot = {
  nodeId: string;
  pointIndex: number;
  beforeElement: TElement;
  beforePoints: TPoint[];
  beforeAbsoluteTransform: Konva.Transform;
};

export const ELEMENT_CREATED_AT_ATTR = "vcElementCreatedAt";
export const DEFAULT_STROKE = "#0f172a";
export const DEFAULT_OPACITY = 0.92;
export const DEFAULT_STROKE_WIDTH = 4;
export const MIN_HIT_STROKE_WIDTH = 16;
export const CURVE_TENSION = 1;
export const EDIT_HANDLE_RADIUS = 7;
export const INSERT_HANDLE_RADIUS = 6;
export const EDIT_HANDLE_STROKE = "#6366f1";
export const EDIT_HANDLE_FILL = "#ffffff";

export function isSupportedTool(tool: string): tool is TShape1dTool {
  return tool === "line" || tool === "arrow";
}

export function isSupportedElementType(type: TShape1dData["type"] | string): type is TShape1dData["type"] {
  return type === "line" || type === "arrow";
}

export function isShape1dNode(node: Konva.Node | null | undefined): node is TShape1dNode {
  if (!(node instanceof Konva.Shape)) {
    return false;
  }

  const data = node.getAttr("vcElementData") as TShape1dData | undefined;
  return Boolean(data && isSupportedElementType(data.type));
}

export function hasRenderableRuntime(node: Konva.Node | null | undefined): node is TShape1dNode {
  return isShape1dNode(node)
    && typeof (node as TShape1dNode).getSelfRect === "function"
    && typeof node.sceneFunc?.() === "function";
}

export function findShape1dNodeById(render: RenderService, id: string) {
  const candidate = render.staticForegroundLayer.findOne((node: Konva.Node) => {
    return isShape1dNode(node) && node.id() === id;
  });

  return isShape1dNode(candidate) ? candidate : null;
}

export function getElementData(node: TShape1dNode) {
  const data = node.getAttr("vcElementData") as TShape1dData | undefined;
  return data ? structuredClone(data) : null;
}

export function getStrokeWidthFromStyle(style: TElementStyle) {
  return style.strokeWidth ?? DEFAULT_STROKE_WIDTH;
}

export function getStrokeColorFromStyle(theme: ThemeService, style: TElementStyle) {
  const rawColor = style.strokeColor ?? style.backgroundColor;
  return resolveThemeColor(theme.getTheme(), rawColor, DEFAULT_STROKE) ?? DEFAULT_STROKE;
}

export function getColorStyleKey(style: TElementStyle): "backgroundColor" | "strokeColor" {
  return typeof style.backgroundColor === "string" && typeof style.strokeColor !== "string"
    ? "backgroundColor"
    : "strokeColor";
}

export function toPositionPatch(render: RenderService, node: TShape1dNode) {
  const worldPosition = getWorldPosition(node);
  const parent = node.getParent();

  return {
    id: node.id(),
    x: worldPosition.x,
    y: worldPosition.y,
    parentGroupId: parent instanceof render.Group ? parent.id() : null,
    updatedAt: Date.now(),
  } satisfies Pick<TElement, "id" | "x" | "y" | "parentGroupId" | "updatedAt">;
}
