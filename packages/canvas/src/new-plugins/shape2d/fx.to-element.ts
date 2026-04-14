import type Konva from "konva";
import type { TElement, TElementStyle } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { fxGetNodeZIndex } from "../../core/fn.get-node-z-index";
import { fxCreateShape2dElement } from "../../core/fn.shape2d";
import { fxGetWorldPosition } from "../../core/fn.world-position";
import { fxGetCanvasParentGroupId } from "../../core/fn.canvas-node-semantics";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { RenderService } from "../../new-services/render/RenderService";
import { fxGetShape2dNodeType } from "./fn.node";

const ELEMENT_STYLE_ATTR = "vcElementStyle";

export type TPortalToShape2dElement = {
  editor: EditorService;
  render: RenderService;
  now: () => number;
};

export type TArgsToShape2dElement = {
  node: Konva.Node;
};

function getNodeStyle(node: Konva.Shape): TElementStyle {
  const baseStyle = structuredClone((node.getAttr(ELEMENT_STYLE_ATTR) as TElementStyle | undefined) ?? {});
  const style: TElementStyle = {
    ...baseStyle,
    opacity: node.opacity(),
    strokeWidth: node.strokeWidth(),
  };

  if (typeof baseStyle.backgroundColor !== "string") {
    const fill = node.fill();
    if (typeof fill === "string") {
      style.backgroundColor = fill;
    }
  }

  if (typeof baseStyle.strokeColor !== "string") {
    const stroke = node.stroke();
    if (typeof stroke === "string") {
      style.strokeColor = stroke;
    }
  }

  return style;
}

function getDiamondBaseSize(node: Konva.Line) {
  const points = node.points();
  const xs = points.filter((_, index) => index % 2 === 0);
  const ys = points.filter((_, index) => index % 2 === 1);

  return {
    width: Math.max(...xs, 0) - Math.min(...xs, 0),
    height: Math.max(...ys, 0) - Math.min(...ys, 0),
  };
}

export function fxToShape2dElement(portal: TPortalToShape2dElement, args: TArgsToShape2dElement) {
  const type = fxGetShape2dNodeType({ render: portal.render, node: args.node });
  if (!type) {
    return null;
  }

  const node = args.node as Konva.Shape;
  const worldPosition = fxGetWorldPosition({
    absolutePosition: node.absolutePosition(),
    parentTransform: node.getLayer()?.getAbsoluteTransform() ?? null,
  });
  const absoluteScale = node.getAbsoluteScale();
  const layer = node.getLayer();
  const layerScaleX = layer?.scaleX() ?? 1;
  const layerScaleY = layer?.scaleY() ?? 1;
  const scaleX = absoluteScale.x / layerScaleX;
  const scaleY = absoluteScale.y / layerScaleY;
  const updatedAt = portal.now();
  const createdAt = Number(node.getAttr("vcElementCreatedAt") ?? updatedAt);

  let x = worldPosition.x;
  let y = worldPosition.y;
  let width = 0;
  let height = 0;

  if (type === "rect" && args.node instanceof portal.render.Rect) {
    width = args.node.width() * scaleX;
    height = args.node.height() * scaleY;
  } else if (type === "diamond" && args.node instanceof portal.render.Line) {
    const baseSize = getDiamondBaseSize(args.node);
    width = baseSize.width * scaleX;
    height = baseSize.height * scaleY;
  } else if (type === "ellipse" && args.node instanceof portal.render.Ellipse) {
    width = args.node.radiusX() * 2 * scaleX;
    height = args.node.radiusY() * 2 * scaleY;
    x = worldPosition.x - width / 2;
    y = worldPosition.y - height / 2;
  } else {
    return null;
  }

  return fxCreateShape2dElement({
    id: node.id(),
    type,
    x,
    y,
    rotation: node.getAbsoluteRotation(),
    width,
    height,
    createdAt,
    updatedAt,
    parentGroupId: fxGetCanvasParentGroupId({ editor: portal.editor, node }),
    zIndex: fxGetNodeZIndex(node),
    style: getNodeStyle(node),
  }) satisfies TElement;
}
