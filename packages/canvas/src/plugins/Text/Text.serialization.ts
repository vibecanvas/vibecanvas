import { TElement, TElementStyle, TTextData } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import { getWorldPosition, setWorldPosition } from "../shared/node-space";
import { getNodeZIndex, setNodeZIndex } from "../shared/render-order.shared";
import type { IPluginContext } from "../shared/interface";
import { ATTACHED_TEXT_NAME, FREE_TEXT_NAME } from "./Text.constants";
import { getContainerId } from "./Text.shared";

export function createTextNode(element: TElement): Konva.Text {
  const data = element.data as TTextData;
  const isAttached = data.containerId !== null;
  const node = new Konva.Text({
    id: element.id,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    width: data.w,
    height: data.h,
    text: data.text,
    fontSize: data.fontSize,
    fontFamily: data.fontFamily,
    align: data.textAlign,
    verticalAlign: data.verticalAlign,
    lineHeight: data.lineHeight,
    wrap: isAttached ? 'word' : 'none',
    draggable: false,
    listening: !isAttached,
    fill: element.style.strokeColor ?? '#000000',
    opacity: element.style.opacity ?? 1,
  });

  node.name(isAttached ? ATTACHED_TEXT_NAME : FREE_TEXT_NAME);
  node.setAttr('vcContainerId', data.containerId);
  setNodeZIndex(node, element.zIndex);
  return node;
}

export function toTElement(node: Konva.Text): TElement {
  const worldPosition = getWorldPosition(node);
  const absScale = node.getAbsoluteScale();
  const layer = node.getLayer();
  const layerScaleX = layer?.scaleX() ?? 1;
  const layerScaleY = layer?.scaleY() ?? 1;
  const parent = node.getParent();
  const parentGroupId = parent instanceof Konva.Group ? parent.id() : null;

  const style: TElementStyle = { opacity: node.opacity() };
  if (typeof node.fill() === 'string') {
    style.strokeColor = node.fill() as string;
  }

  const data: TTextData = {
    type: 'text',
    w: node.width() * (absScale.x / layerScaleX),
    h: node.height() * (absScale.y / layerScaleY),
    text: node.text(),
    originalText: node.text(),
    fontSize: node.fontSize(),
    fontFamily: node.fontFamily(),
    textAlign: node.align() as TTextData['textAlign'],
    verticalAlign: node.verticalAlign() as TTextData['verticalAlign'],
    lineHeight: node.lineHeight(),
    link: null,
    containerId: getContainerId(node),
    autoResize: false,
  };

  return {
    id: node.id(),
    x: worldPosition.x,
    y: worldPosition.y,
    rotation: node.getAbsoluteRotation(),
    bindings: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    locked: false,
    parentGroupId,
    zIndex: getNodeZIndex(node),
    style,
    data,
  };
}

export function updateTextFromElement(node: Konva.Text, element: TElement) {
  const data = element.data as TTextData;
  setWorldPosition(node, { x: element.x, y: element.y });
  node.rotation(element.rotation);
  node.width(data.w);
  node.height(data.h);
  node.text(data.text);
  node.fontSize(data.fontSize);
  node.fontFamily(data.fontFamily);
  node.align(data.textAlign);
  node.verticalAlign(data.verticalAlign);
  node.lineHeight(data.lineHeight);
  node.opacity(element.style.opacity ?? 1);
  node.fill(element.style.strokeColor ?? '#000000');
  setNodeZIndex(node, element.zIndex);
  node.scaleX(1);
  node.scaleY(1);
  node.wrap(data.containerId !== null ? 'word' : 'none');
  node.listening(data.containerId === null);
  node.draggable(data.containerId === null);
  node.name(data.containerId !== null ? ATTACHED_TEXT_NAME : FREE_TEXT_NAME);
  node.setAttr('vcContainerId', data.containerId);
}

export function setupTextCapabilities(
  context: IPluginContext,
  deps: {
    createTextNode: typeof createTextNode;
    setupShapeListeners: (context: IPluginContext, node: Konva.Text) => void;
    toTElement: typeof toTElement;
    updateTextFromElement: typeof updateTextFromElement;
  },
) {
  const prevCreate = context.capabilities.createShapeFromTElement;
  context.capabilities.createShapeFromTElement = (element) => {
    if (element.data.type !== 'text') return prevCreate?.(element) ?? null;
    const node = deps.createTextNode(element);
    deps.setupShapeListeners(context, node);
    node.draggable(element.data.containerId === null);
    return node;
  };

  const prevToElement = context.capabilities.toElement;
  context.capabilities.toElement = (node) => {
    if (node instanceof Konva.Text) return deps.toTElement(node);
    return prevToElement?.(node) ?? null;
  };

  const prevUpdate = context.capabilities.updateShapeFromTElement;
  context.capabilities.updateShapeFromTElement = (element) => {
    if (element.data.type !== 'text') return prevUpdate?.(element) ?? null;
    const node = context.staticForegroundLayer.findOne((n: Konva.Node) => n.id() === element.id) as Konva.Text | null;
    if (!node) return null;
    deps.updateTextFromElement(node, element);
    return node;
  };
}
