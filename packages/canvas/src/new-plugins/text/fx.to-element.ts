import type { TElement, TElementStyle, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { fxGetWorldPosition } from "../../core/fn.world-position";
import { getNodeZIndex } from "../../core/render-order";
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
    parentTransform: args.node.getLayer()?.getAbsoluteTransform() ?? null,
  });
  const absoluteScale = args.node.getAbsoluteScale();
  const layer = args.node.getLayer();
  const layerScaleX = layer?.scaleX() ?? 1;
  const layerScaleY = layer?.scaleY() ?? 1;
  const parent = args.node.getParent();
  const parentGroupId = parent instanceof portal.render.Group ? parent.id() : null;

  const style: TElementStyle = { opacity: args.node.opacity() };
  const fill = args.node.fill();
  const usesThemeTextColor = args.node.getAttr("vcUsesThemeTextColor") === true;
  if (!usesThemeTextColor && typeof fill === "string") {
    style.strokeColor = fill;
  }

  const textScaleX = absoluteScale.x / layerScaleX;
  const textScaleY = absoluteScale.y / layerScaleY;

  const data: TTextData = {
    type: "text",
    w: args.node.width() * textScaleX,
    h: args.node.height() * textScaleY,
    text: args.node.text(),
    originalText: (args.node.getAttr("vcOriginalText") as string | undefined) ?? args.node.text(),
    fontSize: Math.max(1, args.node.fontSize() * textScaleX),
    fontFamily: args.node.fontFamily(),
    textAlign: args.node.align() as TTextData["textAlign"],
    verticalAlign: args.node.verticalAlign() as TTextData["verticalAlign"],
    lineHeight: args.node.lineHeight(),
    link: null,
    containerId: (args.node.getAttr("vcContainerId") as string | null | undefined) ?? null,
    autoResize: (args.node.getAttr("vcTextAutoResize") as boolean | undefined) ?? false,
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
    zIndex: getNodeZIndex(args.node),
    style,
    data,
  } satisfies TElement;
}
