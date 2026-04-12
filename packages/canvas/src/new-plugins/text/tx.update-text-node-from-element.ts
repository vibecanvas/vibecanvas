import type { ThemeService } from "@vibecanvas/service-theme";
import { fxGetAbsolutePositionFromWorldPosition } from "../../core/fn.world-position";
import type { TElement, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { RenderService } from "../../new-services/render/RenderService";

export type TPortalUpdateTextNodeFromElement = {
  render: RenderService;
  theme: ThemeService;
};

export type TArgsUpdateTextNodeFromElement = {
  element: TElement;
  freeTextName: string;
};

const ATTACHED_TEXT_NAME = "attached-text";

export function txUpdateTextNodeFromElement(portal: TPortalUpdateTextNodeFromElement, args: TArgsUpdateTextNodeFromElement) {
  if (args.element.data.type !== "text") {
    return false;
  }

  const node = portal.render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return candidate instanceof portal.render.Text && candidate.id() === args.element.id;
  });
  if (!(node instanceof portal.render.Text)) {
    return false;
  }

  const data = args.element.data as TTextData;
  const absolutePosition = fxGetAbsolutePositionFromWorldPosition({
    worldPosition: { x: args.element.x, y: args.element.y },
    parentTransform: node.getLayer()?.getAbsoluteTransform() ?? null,
  });

  node.absolutePosition(absolutePosition);
  node.rotation(args.element.rotation);
  node.width(data.w);
  node.height(data.h);
  node.text(data.text);
  node.fontSize(data.fontSize);
  node.fontFamily(data.fontFamily);
  node.align(data.textAlign);
  node.verticalAlign(data.verticalAlign);
  node.lineHeight(data.lineHeight);
  node.opacity(args.element.style.opacity ?? 1);
  node.fill(args.element.style.strokeColor ?? portal.theme.getTheme().colors.canvasText);
  node.setAttr("vcUsesThemeTextColor", !args.element.style.strokeColor);
  node.setAttr("vcContainerId", data.containerId ?? null);
  node.setAttr("vcOriginalText", data.originalText);
  node.setAttr("vcTextAutoResize", data.autoResize);
  node.scale({ x: 1, y: 1 });
  node.wrap("none");
  node.listening(data.containerId === null);
  node.draggable(data.containerId === null);
  node.name(data.containerId === null ? args.freeTextName : ATTACHED_TEXT_NAME);
  return true;
}
