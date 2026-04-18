import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { ThemeService } from "@vibecanvas/service-theme";
import type Konva from "konva";
import { fnIsCanvasGroupNode } from "../../core/fn.canvas-node-semantics";
import {
  fnCreateShape2dTextData,
  fnGetShape2dTextData,
  fnIsShape2dElementType,
} from "../../core/fn.shape2d";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";
import type { EditorService } from "../../services/editor/EditorService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import { fnGetShapeTextHostBounds } from "./fn.text-host-bounds";
import {
  DEFAULT_ATTACHED_TEXT_ALIGN,
  DEFAULT_ATTACHED_TEXT_VERTICAL_ALIGN,
  DEFAULT_TEXT_LINE_HEIGHT,
  TEXT_FONT_SIZE_TOKEN_BY_PRESET,
} from "../text/CONSTANTS";
import {
  SHAPE2D_INLINE_TEXT_DERIVED_ATTR,
  SHAPE2D_INLINE_TEXT_HOST_ID_ATTR,
  SHAPE2D_INLINE_TEXT_ID_SUFFIX,
  SHAPE2D_INLINE_TEXT_NAME,
} from "./CONSTANTS";

export type TPortalAttachedText = {
  Konva: typeof Konva;
  canvasRegistry: Pick<CanvasRegistryService, "toElement">;
  editor: Pick<EditorService, "editingTextId">;
  scene: SceneService;
  selection: SelectionService;
  theme: ThemeService;
  enterEditMode: (args: {
    freeTextName: string;
    node: Konva.Text;
    isNew: boolean;
    shapeTextHostNode: Konva.Shape;
  }) => void;
};

export type TArgsGetAttachedTextNode = {
  shapeNode: Konva.Shape;
};

export type TArgsSyncAttachedTextNodeToShape = {
  shapeNode: Konva.Shape;
  textNode?: Konva.Text;
  forceCreate?: boolean;
};

export type TArgsOpenAttachedTextEditMode = {
  shapeNode: Konva.Shape;
};

function getTextNodeId(shapeNodeId: string) {
  return `${shapeNodeId}${SHAPE2D_INLINE_TEXT_ID_SUFFIX}`;
}

function getShapeTextFillColor(theme: ThemeService, element: Pick<TElement, "style">) {
  return theme.resolveThemeColor(
    element.style.strokeColor,
    theme.getTheme().colors.canvasText,
  ) ?? theme.getTheme().colors.canvasText;
}

function getTextNode(portal: TPortalAttachedText, hostId: string) {
  const node = portal.scene.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return candidate instanceof portal.Konva.Text
      && candidate.getAttr(SHAPE2D_INLINE_TEXT_HOST_ID_ATTR) === hostId;
  });

  return node instanceof portal.Konva.Text ? node : null;
}

function getHostElement(portal: TPortalAttachedText, shapeNode: Konva.Shape) {
  const element = portal.canvasRegistry.toElement(shapeNode);
  if (!element || !fnIsShape2dElementType(element.data.type)) {
    return null;
  }

  return element;
}

function createTextNode(portal: TPortalAttachedText, shapeNode: Konva.Shape) {
  return new portal.Konva.Text({
    id: getTextNodeId(shapeNode.id()),
    name: SHAPE2D_INLINE_TEXT_NAME,
    draggable: false,
    listening: false,
  });
}

function getOrCreateTextNode(portal: TPortalAttachedText, args: {
  shapeNode: Konva.Shape;
  textNode?: Konva.Text;
}) {
  return args.textNode
    ?? getTextNode(portal, args.shapeNode.id())
    ?? createTextNode(portal, args.shapeNode);
}

export function fxGetAttachedTextNode(portal: TPortalAttachedText, args: TArgsGetAttachedTextNode) {
  return getTextNode(portal, args.shapeNode.id());
}

export function fxSyncAttachedTextNodeToShape(portal: TPortalAttachedText, args: TArgsSyncAttachedTextNodeToShape) {
  const hostElement = getHostElement(portal, args.shapeNode);
  if (!hostElement) {
    args.textNode?.destroy();
    return null;
  }

  const bounds = fnGetShapeTextHostBounds({
    Rect: portal.Konva.Rect,
    Ellipse: portal.Konva.Ellipse,
    Line: portal.Konva.Line,
    node: args.shapeNode,
  });
  if (!bounds) {
    args.textNode?.destroy();
    return null;
  }

  const inlineTextData = fnGetShape2dTextData(hostElement)
    ?? (args.forceCreate
      ? fnCreateShape2dTextData({
          width: bounds.width,
          height: bounds.height,
        })
      : null);
  const shouldRenderText = inlineTextData !== null && (args.forceCreate || inlineTextData.text !== "");
  if (!shouldRenderText) {
    args.textNode?.destroy();
    return null;
  }

  const textNode = getOrCreateTextNode(portal, { shapeNode: args.shapeNode, textNode: args.textNode });
  const parentNode = args.shapeNode.getParent();
  const parent = parentNode && fnIsCanvasGroupNode(parentNode)
    ? parentNode
    : portal.scene.staticForegroundLayer;
  if (!(parent instanceof portal.Konva.Layer) && !(parent instanceof portal.Konva.Group)) {
    return null;
  }

  if (textNode.getParent() !== parent) {
    parent.add(textNode);
  }

  textNode.id(getTextNodeId(args.shapeNode.id()));
  textNode.position({ x: bounds.x, y: bounds.y });
  textNode.rotation(bounds.rotation);
  textNode.width(Math.max(4, bounds.width));
  textNode.height(Math.max(4, bounds.height));
  textNode.text(inlineTextData.text);
  textNode.fontSize(portal.theme.resolveFontSize(hostElement.style.fontSize ?? TEXT_FONT_SIZE_TOKEN_BY_PRESET.M));
  textNode.fontFamily(inlineTextData.fontFamily);
  textNode.align(hostElement.style.textAlign ?? DEFAULT_ATTACHED_TEXT_ALIGN);
  textNode.verticalAlign(hostElement.style.verticalAlign ?? DEFAULT_ATTACHED_TEXT_VERTICAL_ALIGN);
  textNode.lineHeight(DEFAULT_TEXT_LINE_HEIGHT);
  textNode.wrap("word");
  textNode.opacity(hostElement.style.opacity ?? 1);
  textNode.fill(getShapeTextFillColor(portal.theme, hostElement));
  textNode.visible(true);
  textNode.draggable(false);
  textNode.listening(false);
  textNode.name(SHAPE2D_INLINE_TEXT_NAME);
  textNode.setAttr(SHAPE2D_INLINE_TEXT_DERIVED_ATTR, true);
  textNode.setAttr(SHAPE2D_INLINE_TEXT_HOST_ID_ATTR, args.shapeNode.id());
  textNode.setAttr("vcOriginalText", inlineTextData.originalText);
  textNode.setAttr("vcTextAutoResize", false);
  textNode.setAttr("vcUsesThemeTextColor", !hostElement.style.strokeColor);
  textNode.setAttr("vcZIndex", args.shapeNode.getAttr("vcZIndex") as string | undefined);
  textNode.zIndex(Math.min(args.shapeNode.zIndex() + 1, Math.max(parent.getChildren().length - 1, 0)));
  return textNode;
}

export function fxOpenAttachedTextEditMode(portal: TPortalAttachedText, args: TArgsOpenAttachedTextEditMode) {
  if (portal.selection.mode !== "select") {
    return false;
  }

  if (portal.editor.editingTextId !== null) {
    return false;
  }

  const isNew = fxGetAttachedTextNode(portal, { shapeNode: args.shapeNode }) === null;
  const textNode = fxSyncAttachedTextNodeToShape(portal, {
    shapeNode: args.shapeNode,
    forceCreate: true,
  });
  if (!textNode) {
    return false;
  }

  portal.enterEditMode({
    freeTextName: SHAPE2D_INLINE_TEXT_NAME,
    node: textNode,
    isNew,
    shapeTextHostNode: args.shapeNode,
  });
  return true;
}
