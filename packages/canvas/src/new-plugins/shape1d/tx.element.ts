import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { TThemeDefinition } from "@vibecanvas/service-theme";
import { fnGetAbsolutePositionFromWorldPosition } from "../../core/fn.world-position";
import { DEFAULT_OPACITY, ELEMENT_CREATED_AT_ATTR, MIN_HIT_STROKE_WIDTH, type TShape1dNode } from "./CONSTANTS";
import { fxGetStrokeColorFromStyle, fxGetStrokeWidthFromStyle, fxIsSupportedElementType, fxToTElement } from "./fx.node";
import { txCreateShapeFromElement } from "./tx.render";

export type TPortalTxUpdateShapeFromElement = {
  theme: { getTheme(): string | TThemeDefinition };
  resolveThemeColor: (theme: string | TThemeDefinition, value: string | undefined, fallback?: string | undefined) => string | undefined;
  setNodeZIndex: (node: TShape1dNode, zIndex: string) => void;
};
export type TArgsTxUpdateShapeFromElement = { node: TShape1dNode; element: TElement };
export function txUpdateShapeFromElement(portal: TPortalTxUpdateShapeFromElement, args: TArgsTxUpdateShapeFromElement) {
  if (!fxIsSupportedElementType({}, { type: args.element.data.type })) {
    return;
  }

  const strokeWidth = fxGetStrokeWidthFromStyle({}, { style: args.element.style });
  const color = fxGetStrokeColorFromStyle({ theme: portal.theme, resolveThemeColor: portal.resolveThemeColor }, { style: args.element.style });
  args.node.absolutePosition(fnGetAbsolutePositionFromWorldPosition({
    worldPosition: { x: args.element.x, y: args.element.y },
    parentTransform: args.node.getLayer()?.getAbsoluteTransform() ?? null,
  }));
  args.node.rotation(args.element.rotation);
  args.node.stroke(color);
  args.node.fill(color);
  args.node.strokeWidth(strokeWidth);
  args.node.hitStrokeWidth(Math.max(MIN_HIT_STROKE_WIDTH, strokeWidth + 8));
  args.node.opacity(args.element.style.opacity ?? DEFAULT_OPACITY);
  args.node.scale({ x: 1, y: 1 });
  args.node.setAttr(ELEMENT_CREATED_AT_ATTR, args.element.createdAt);
  args.node.setAttr("vcElementData", structuredClone(args.element.data));
  args.node.setAttr("vcElementStyle", structuredClone(args.element.style));
  portal.setNodeZIndex(args.node, args.element.zIndex);
}

export type TPortalTxCreatePreviewClone = {
  createId: () => string;
  now: () => number;
  editor: { toGroup(node: Konva.Node): unknown };
  theme: { getTheme(): string | TThemeDefinition };
  resolveThemeColor: (theme: string | TThemeDefinition, value: string | undefined, fallback?: string | undefined) => string | undefined;
  createShapeNode: (config?: Record<string, unknown>) => TShape1dNode;
  setNodeZIndex: (node: TShape1dNode, zIndex: string) => void;
};
export type TArgsTxCreatePreviewClone = { node: TShape1dNode };
export function txCreatePreviewClone(portal: TPortalTxCreatePreviewClone, args: TArgsTxCreatePreviewClone) {
  const element = fxToTElement({ editor: portal.editor, now: portal.now }, { node: args.node });
  const timestamp = portal.now();
  const clone = txCreateShapeFromElement({
    createShapeNode: portal.createShapeNode,
    setNodeZIndex: portal.setNodeZIndex,
    theme: portal.theme,
    resolveThemeColor: portal.resolveThemeColor,
  }, {
    element: {
      ...element,
      id: portal.createId(),
      parentGroupId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      data: structuredClone(element.data),
      style: structuredClone(element.style),
      zIndex: "",
    },
  });

  clone.setDraggable(true);
  return clone;
}
