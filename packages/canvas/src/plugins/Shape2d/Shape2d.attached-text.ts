import { TElement } from "@vibecanvas/automerge-service/types/canvas-doc";
import Konva from "konva";
import type { IPluginContext } from "../shared/interface";
import { TextPlugin } from "../Text/Text.plugin";

export function getAttachedTextNode(deps: { context: IPluginContext }, rect: Konva.Rect) {
  return TextPlugin.findAttachedTextByContainerId(deps.context, rect.id());
}

export function createAttachedTextNode(deps: { context: IPluginContext }, rect: Konva.Rect) {
  const { context } = deps;
  const parent = rect.getParent();
  const parentGroupId = parent instanceof Konva.Group ? parent.id() : null;
  const textElement: TElement = {
    id: crypto.randomUUID(),
    x: rect.x(),
    y: rect.y(),
    rotation: rect.rotation(),
    bindings: [],
    createdAt: Date.now(),
    locked: false,
    parentGroupId,
    updatedAt: Date.now(),
    zIndex: "",
    style: {
      opacity: rect.opacity(),
    },
    data: {
      type: "text",
      w: Math.max(4, rect.width()),
      h: Math.max(4, rect.height()),
      text: "",
      originalText: "",
      fontSize: Math.max(14, Math.min(24, rect.height() * 0.35)),
      fontFamily: "Arial",
      textAlign: "center",
      verticalAlign: "middle",
      lineHeight: 1.2,
      link: null,
      containerId: rect.id(),
      autoResize: false,
    },
  };

  const textParent = parent instanceof Konva.Group || parent instanceof Konva.Layer
    ? parent
    : context.staticForegroundLayer;
  const textNode = TextPlugin.createTextNode(textElement);
  textParent.add(textNode);
  context.capabilities.renderOrder?.assignOrderOnInsert({
    parent: textParent,
    nodes: [rect, textNode],
    position: "front",
  });
  context.crdt.patch({ elements: [TextPlugin.toTElement(textNode)], groups: [] });

  return textNode;
}

export function syncAttachedTextToRect(
  deps: { context: IPluginContext },
  payload: { rect: Konva.Rect; textNode?: Konva.Text | null },
) {
  const { context } = deps;
  const { rect, textNode } = payload;
  const attachedText = textNode ?? getAttachedTextNode(deps, rect);
  if (!attachedText) return null;

  const parent = rect.getParent();
  if (parent && attachedText.getParent() !== parent) {
    parent.add(attachedText);
  }

  TextPlugin.syncAttachedTextToRect(rect, attachedText);

  attachedText.name(TextPlugin.ATTACHED_TEXT_NAME);
  attachedText.setAttr("vcContainerId", rect.id());

  const linkedElement = TextPlugin.toTElement(attachedText);
  linkedElement.parentGroupId = parent instanceof Konva.Group ? parent.id() : null;
  context.crdt.patch({ elements: [linkedElement], groups: [] });

  return attachedText;
}
