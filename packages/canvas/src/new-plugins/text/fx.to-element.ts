import type { TElement, TElementStyle, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { fxGetWorldPosition } from "../../core/fn.world-position";
import type { RenderService } from "../../new-services/render/RenderService";
import type Konva from "konva";

export type TPortalToElement = {
  render: RenderService;
};

export type TArgsToElement = {
  node: Konva.Text;
  createdAt: number;
  updatedAt: number;
};

export function fxToElement(portal: TPortalToElement, args: TArgsToElement) {
  const worldPosition = fxGetWorldPosition({
    absolutePosition: args.node.absolutePosition(),
    parentTransform: args.node.getParent()?.getAbsoluteTransform() ?? null,
  });
  const absoluteScale = args.node.getAbsoluteScale();
  const layer = args.node.getLayer();
  const layerScaleX = layer?.scaleX() ?? 1;
  const layerScaleY = layer?.scaleY() ?? 1;
  const parent = args.node.getParent();
  const parentGroupId = parent instanceof portal.render.Group ? parent.id() : null;

  const style: TElementStyle = { opacity: args.node.opacity() };
  const fill = args.node.fill();
  if (typeof fill === "string") {
    style.strokeColor = fill;
  }

  const data: TTextData = {
    type: "text",
    w: args.node.width() * (absoluteScale.x / layerScaleX),
    h: args.node.height() * (absoluteScale.y / layerScaleY),
    text: args.node.text(),
    originalText: args.node.text(),
    fontSize: args.node.fontSize(),
    fontFamily: args.node.fontFamily(),
    textAlign: args.node.align() as TTextData["textAlign"],
    verticalAlign: args.node.verticalAlign() as TTextData["verticalAlign"],
    lineHeight: args.node.lineHeight(),
    link: null,
    containerId: null,
    autoResize: false,
  };

  return {
    id: args.node.id(),
    x: worldPosition.x,
    y: worldPosition.y,
    rotation: args.node.getAbsoluteRotation(),
    bindings: [],
    createdAt: args.createdAt,
    updatedAt: args.updatedAt,
    locked: false,
    parentGroupId,
    zIndex: "",
    style,
    data,
  } satisfies TElement;
}
