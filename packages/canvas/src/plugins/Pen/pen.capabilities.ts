import Konva from "konva";
import type { IPluginContext } from "../shared/interface";
import {
  createPenPathFromElement,
  isPenPath,
  penPathToElement,
  updatePenPathFromElement,
} from "./pen.element";
import { setupPenShapeListeners } from "./pen.listeners";

export function setupPenCapabilities(context: IPluginContext) {
  const previousCreate = context.capabilities.createShapeFromTElement;
  context.capabilities.createShapeFromTElement = (element) => {
    if (element.data.type !== "pen") return previousCreate?.(element) ?? null;

    const node = createPenPathFromElement(element);
    setupPenShapeListeners(context, node);
    node.draggable(true);
    return node;
  };

  const previousToElement = context.capabilities.toElement;
  context.capabilities.toElement = (node) => {
    if (node instanceof Konva.Path && isPenPath(node)) {
      return penPathToElement(node);
    }
    return previousToElement?.(node) ?? null;
  };

  const previousUpdate = context.capabilities.updateShapeFromTElement;
  context.capabilities.updateShapeFromTElement = (element) => {
    if (element.data.type !== "pen") return previousUpdate?.(element) ?? null;

    const node = context.staticForegroundLayer.findOne((candidate: Konva.Node) => {
      return candidate instanceof Konva.Path && candidate.id() === element.id;
    });

    if (!(node instanceof Konva.Path)) return null;

    updatePenPathFromElement(node, element);
    return node;
  };
}
