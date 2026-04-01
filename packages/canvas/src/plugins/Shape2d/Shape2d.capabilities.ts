import { TElement, TElementData } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import type { IPluginContext } from "../shared/interface";
import { getWorldPosition, setWorldPosition } from "../shared/node-space";
import { setNodeZIndex } from "../shared/render-order.shared";
import { applyDiamondSize, createShapeFromElement, isDiamondNode, toTElement } from "./Shape2d.shared";
import { getAttachedTextNode, syncAttachedTextToRect } from "./Shape2d.attached-text";
import { setupShapeListeners } from "./Shape2d.drag";

export const supportedTypes: Set<TElementData["type"]> = new Set(["rect", "diamond", "ellipse"]);

export function updateShapeFromTElement(
  deps: { context: IPluginContext },
  payload: { shape: Konva.Shape; element: TElement },
) {
  const { shape, element } = payload;

  if (shape instanceof Konva.Ellipse && element.data.type === "ellipse") {
    const nextPosition = { x: element.x + element.data.rx, y: element.y + element.data.ry };
    const worldPosition = getWorldPosition(shape);
    if (worldPosition.x !== nextPosition.x || worldPosition.y !== nextPosition.y) {
      setWorldPosition(shape, nextPosition);
    }
  } else {
    const worldPosition = getWorldPosition(shape);
    if (worldPosition.x !== element.x || worldPosition.y !== element.y) {
      setWorldPosition(shape, { x: element.x, y: element.y });
    }
  }

  if (shape.rotation() !== element.rotation) shape.rotation(element.rotation);
  if (shape.scaleX() !== 1) shape.scaleX(1);
  if (shape.scaleY() !== 1) shape.scaleY(1);
  if (element.style.backgroundColor !== shape.fill()) shape.fill(element.style.backgroundColor);
  if (element.style.strokeColor !== shape.stroke()) shape.stroke(element.style.strokeColor);
  if (element.style.strokeWidth !== shape.strokeWidth()) shape.strokeWidth(element.style.strokeWidth);
  if (element.style.opacity !== shape.opacity()) shape.opacity(element.style.opacity);
  setNodeZIndex(shape, element.zIndex);

  if (element.data.type === "rect" && shape instanceof Konva.Rect) {
    if (shape.width() !== element.data.w) shape.width(element.data.w);
    if (shape.height() !== element.data.h) shape.height(element.data.h);
  } else if (element.data.type === "diamond" && isDiamondNode(shape)) {
    applyDiamondSize(shape, element.data.w, element.data.h);
  } else if (element.data.type === "ellipse" && shape instanceof Konva.Ellipse) {
    if (shape.radiusX() !== element.data.rx) shape.radiusX(element.data.rx);
    if (shape.radiusY() !== element.data.ry) shape.radiusY(element.data.ry);
  }

  if (element.data.type === "rect" && shape instanceof Konva.Rect) {
    syncAttachedTextToRect(deps, { rect: shape });
  }
}

export function setupShape2dCapabilities(deps: { context: IPluginContext }) {
  const { context } = deps;
  const currentCreateShapeFromTElement = context.capabilities.createShapeFromTElement;
  context.capabilities.createShapeFromTElement = (element) => {
    if (!supportedTypes.has(element.data.type)) {
      return currentCreateShapeFromTElement?.(element) || null;
    }

    const shape = createShapeFromElement(element);
    if (shape) {
      setupShapeListeners({ context }, shape);
      shape.setDraggable(true);
    }
    return shape;
  };

  const currentToElement = context.capabilities.toElement;
  context.capabilities.toElement = (node) => {
    if (node instanceof Konva.Rect || node instanceof Konva.Ellipse || isDiamondNode(node)) {
      return toTElement(node);
    }
    return currentToElement?.(node) || null;
  };

  const previousGetBundle = context.capabilities.getReorderBundle;
  context.capabilities.getReorderBundle = (node) => {
    if (!(node instanceof Konva.Rect)) return previousGetBundle?.(node) ?? [node];

    const attachedText = getAttachedTextNode(deps, node);
    if (!attachedText || attachedText.getParent() !== node.getParent()) {
      return previousGetBundle?.(node) ?? [node];
    }

    return [node, attachedText];
  };

  const previousUpdate = context.capabilities.updateShapeFromTElement;
  context.capabilities.updateShapeFromTElement = (element) => {
    if (!supportedTypes.has(element.data.type)) {
      return previousUpdate?.(element) || null;
    }

    const shape = context.staticForegroundLayer.findOne((node: Konva.Node) => node.id() === element.id) as Konva.Shape;
    if (!shape) return null;

    updateShapeFromTElement(deps, { shape, element });
    return shape;
  };
}
