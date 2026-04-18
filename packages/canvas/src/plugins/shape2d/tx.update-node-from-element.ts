import type Konva from "konva";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { fnGetDiamondPoints } from "../../core/fn.shape2d";
import { fnGetAbsolutePositionFromWorldPosition } from "../../core/fn.world-position";
import type { SceneService } from "../../services/scene/SceneService";
import type { ThemeService } from "@vibecanvas/service-theme";
import { SHAPE2D_TEXT_DATA_ATTR } from "./CONSTANTS";

const ELEMENT_STYLE_ATTR = "vcElementStyle";

export type TPortalUpdateShape2dNodeFromElement = {
  Rect: typeof Konva.Rect;
  Line: typeof Konva.Line;
  Ellipse: typeof Konva.Ellipse;
  render: SceneService;
  theme: ThemeService;
  setNodeZIndex: (node: Konva.Shape, zIndex: string) => void;
};

export type TArgsUpdateShape2dNodeFromElement = {
  node: Konva.Node;
  element: TElement;
};

function syncShapeFill(
  node: Konva.Shape,
  theme: ThemeService,
  backgroundColor: string | undefined,
) {
  const fill = theme.resolveThemeColor(backgroundColor);
  if (typeof fill === "string") {
    node.fillEnabled(true);
    node.fill(fill);
    return;
  }

  node.fillEnabled(false);
  node.fill(undefined);
}

function syncShapeStroke(
  node: Konva.Shape,
  theme: ThemeService,
  strokeColor: string | undefined,
  strokeWidth: string | undefined,
  strokeStyle: TElement["style"]["strokeStyle"],
) {
  const resolvedStrokeWidth = theme.resolveStrokeWidth(strokeWidth, 0);
  const stroke = theme.resolveThemeColor(strokeColor);
  if (typeof stroke === "string") {
    node.strokeEnabled(true);
    node.stroke(stroke);
    node.strokeWidth(resolvedStrokeWidth);
    node.dash(theme.resolveStrokeDash(strokeStyle, strokeWidth));
    return;
  }

  node.strokeEnabled(false);
  node.stroke(undefined);
  node.strokeWidth(resolvedStrokeWidth);
  node.dash(theme.resolveStrokeDash(strokeStyle, strokeWidth));
}

export function txUpdateShape2dNodeFromElement(
  portal: TPortalUpdateShape2dNodeFromElement,
  args: TArgsUpdateShape2dNodeFromElement,
) {
  const style = args.element.style;
  const node = args.node;

  if (args.element.data.type === "rect" && node instanceof portal.Rect) {
    const absolutePosition = fnGetAbsolutePositionFromWorldPosition({
      worldPosition: { x: args.element.x, y: args.element.y },
      parentTransform: node.getLayer()?.getAbsoluteTransform() ?? null,
    });

    node.absolutePosition(absolutePosition);
    node.rotation(args.element.rotation);
    node.width(args.element.data.w);
    node.height(args.element.data.h);
    node.cornerRadius(portal.theme.resolveCornerRadius(style.cornerRadius, 0));
    node.scale({ x: args.element.scaleX ?? 1, y: args.element.scaleY ?? 1 });
    node.opacity(style.opacity ?? 1);
    node.draggable(true);
    node.listening(true);
    node.setAttr("vcShape2dType", "rect");
    node.setAttr("vcElementCreatedAt", args.element.createdAt);
    node.setAttr(ELEMENT_STYLE_ATTR, structuredClone(style));
    node.setAttr(SHAPE2D_TEXT_DATA_ATTR, structuredClone(args.element.data.text ?? null));
    syncShapeFill(node, portal.theme, style.backgroundColor);
    syncShapeStroke(node, portal.theme, style.strokeColor, style.strokeWidth, style.strokeStyle);
    portal.setNodeZIndex(node, args.element.zIndex);
    return true;
  }

  if (args.element.data.type === "diamond" && node instanceof portal.Line) {
    const absolutePosition = fnGetAbsolutePositionFromWorldPosition({
      worldPosition: { x: args.element.x, y: args.element.y },
      parentTransform: node.getLayer()?.getAbsoluteTransform() ?? null,
    });

    node.absolutePosition(absolutePosition);
    node.rotation(args.element.rotation);
    node.points(fnGetDiamondPoints({
      width: args.element.data.w,
      height: args.element.data.h,
    }));
    node.closed(true);
    node.scale({ x: args.element.scaleX ?? 1, y: args.element.scaleY ?? 1 });
    node.opacity(style.opacity ?? 1);
    node.draggable(true);
    node.listening(true);
    node.setAttr("vcShape2dType", "diamond");
    node.setAttr("vcElementCreatedAt", args.element.createdAt);
    node.setAttr(ELEMENT_STYLE_ATTR, structuredClone(style));
    node.setAttr(SHAPE2D_TEXT_DATA_ATTR, structuredClone(args.element.data.text ?? null));
    syncShapeFill(node, portal.theme, style.backgroundColor);
    syncShapeStroke(node, portal.theme, style.strokeColor, style.strokeWidth, style.strokeStyle);
    portal.setNodeZIndex(node, args.element.zIndex);
    return true;
  }

  if (args.element.data.type === "ellipse" && node instanceof portal.Ellipse) {
    const absolutePosition = fnGetAbsolutePositionFromWorldPosition({
      worldPosition: {
        x: args.element.x + args.element.data.rx,
        y: args.element.y + args.element.data.ry,
      },
      parentTransform: node.getLayer()?.getAbsoluteTransform() ?? null,
    });

    node.absolutePosition(absolutePosition);
    node.rotation(args.element.rotation);
    node.radiusX(args.element.data.rx);
    node.radiusY(args.element.data.ry);
    node.scale({ x: args.element.scaleX ?? 1, y: args.element.scaleY ?? 1 });
    node.opacity(style.opacity ?? 1);
    node.draggable(true);
    node.listening(true);
    node.setAttr("vcShape2dType", "ellipse");
    node.setAttr("vcElementCreatedAt", args.element.createdAt);
    node.setAttr(ELEMENT_STYLE_ATTR, structuredClone(style));
    node.setAttr(SHAPE2D_TEXT_DATA_ATTR, structuredClone(args.element.data.text ?? null));
    syncShapeFill(node, portal.theme, style.backgroundColor);
    syncShapeStroke(node, portal.theme, style.strokeColor, style.strokeWidth, style.strokeStyle);
    portal.setNodeZIndex(node, args.element.zIndex);
    return true;
  }

  return false;
}
