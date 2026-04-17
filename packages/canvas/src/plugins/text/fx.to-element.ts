import type { TElement, TElementStyle, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { fnGetNodeZIndex } from "../../core/fn.get-node-z-index";
import { fnGetWorldPosition } from "../../core/fn.world-position";
import { fnGetCanvasParentGroupId } from "../../core/fn.canvas-node-semantics";
import type Konva from "konva";
import { DEFAULT_TEXT_FONT_SIZE_TOKEN } from "./CONSTANTS";

const ELEMENT_STYLE_ATTR = "vcElementStyle";

export type TPortalToElement = {
  editor: { toGroup(node: Konva.Node): unknown };
};

export type TArgsToElement = {
  node: Konva.Text;
  createdAt: number;
  updatedAt: number;
};

export function fxToElement(portal: TPortalToElement, args: TArgsToElement) {
  const worldPosition = fnGetWorldPosition({
    absolutePosition: args.node.absolutePosition(),
    parentTransform: args.node.getLayer()?.getAbsoluteTransform() ?? null,
  });
  const absoluteScale = args.node.getAbsoluteScale();
  const layer = args.node.getLayer();
  const layerScaleX = layer?.scaleX() ?? 1;
  const layerScaleY = layer?.scaleY() ?? 1;
  const parentGroupId = fnGetCanvasParentGroupId(args.node);

  const baseStyle = structuredClone((args.node.getAttr(ELEMENT_STYLE_ATTR) as TElementStyle | undefined) ?? {});

  const textScaleX = absoluteScale.x / layerScaleX;
  const textScaleY = absoluteScale.y / layerScaleY;

  const style: TElementStyle = {
    ...baseStyle,
    opacity: args.node.opacity(),
    fontSize: baseStyle.fontSize ?? DEFAULT_TEXT_FONT_SIZE_TOKEN,
    textAlign: args.node.align() as "left" | "center" | "right",
    verticalAlign: args.node.verticalAlign() as "top" | "middle" | "bottom",
  };
  const fill = args.node.fill();
  const usesThemeTextColor = args.node.getAttr("vcUsesThemeTextColor") === true;
  if (!usesThemeTextColor && typeof baseStyle.strokeColor !== "string" && typeof fill === "string") {
    style.strokeColor = fill;
  }
  const data: TTextData = {
    type: "text",
    w: args.node.width(),
    h: args.node.height(),
    text: args.node.text(),
    originalText: (args.node.getAttr("vcOriginalText") as string | undefined) ?? args.node.text(),
    fontFamily: args.node.fontFamily(),
    link: null,
    containerId: (args.node.getAttr("vcContainerId") as string | null | undefined) ?? null,
    autoResize: (args.node.getAttr("vcTextAutoResize") as boolean | undefined) ?? false,
  };

  return {
    id: args.node.id(),
    x: worldPosition.x,
    y: worldPosition.y,
    rotation: args.node.getAbsoluteRotation(),
    scaleX: textScaleX,
    scaleY: textScaleY,
    bindings: [],
    createdAt: args.createdAt,
    updatedAt: args.updatedAt,
    locked: false,
    parentGroupId,
    zIndex: fnGetNodeZIndex({ node: args.node }),
    style,
    data,
  } satisfies TElement;
}
