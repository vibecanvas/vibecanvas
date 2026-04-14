import type { TElement, TElementStyle, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { fnGetNodeZIndex } from "../../core/fn.get-node-z-index";
import { fnGetNearestFontSizePreset } from "../../core/fn.text-style";
import { fnGetWorldPosition } from "../../core/fn.world-position";
import { fxGetCanvasParentGroupId } from "../../core/fx.canvas-node-semantics";
import type { SceneService } from "../../new-services/scene/SceneService";
import type Konva from "konva";

const ELEMENT_STYLE_ATTR = "vcElementStyle";

export type TPortalToElement = {
  editor: { toGroup(node: Konva.Node): unknown };
  render: SceneService;
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
  const parentGroupId = fxGetCanvasParentGroupId({}, { editor: portal.editor, node: args.node });

  const baseStyle = structuredClone((args.node.getAttr(ELEMENT_STYLE_ATTR) as TElementStyle | undefined) ?? {});
  const style: TElementStyle = {
    ...baseStyle,
    opacity: args.node.opacity(),
  };
  const fill = args.node.fill();
  const usesThemeTextColor = args.node.getAttr("vcUsesThemeTextColor") === true;
  if (!usesThemeTextColor && typeof baseStyle.strokeColor !== "string" && typeof fill === "string") {
    style.strokeColor = fill;
  }

  const textScaleX = absoluteScale.x / layerScaleX;
  const textScaleY = absoluteScale.y / layerScaleY;

  const fontSize = Math.max(1, args.node.fontSize() * textScaleX);
  const data: TTextData = {
    type: "text",
    w: args.node.width() * textScaleX,
    h: args.node.height() * textScaleY,
    text: args.node.text(),
    originalText: (args.node.getAttr("vcOriginalText") as string | undefined) ?? args.node.text(),
    fontSize,
    fontSizePreset: (args.node.getAttr("vcFontSizePreset") as TTextData["fontSizePreset"] | undefined) ?? fnGetNearestFontSizePreset(fontSize),
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
    zIndex: fnGetNodeZIndex({}, { node: args.node }),
    style,
    data,
  } satisfies TElement;
}
