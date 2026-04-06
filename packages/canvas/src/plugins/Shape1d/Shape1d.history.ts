import type { TElement } from "@vibecanvas/automerge-service/types/canvas-doc";
import Konva from "konva";
import type { IPluginContext } from "../shared/interface";
import type { TShape1dNode } from "./Shape1d.shared";
import { createShapeFromElement } from "./Shape1d.render";
import { isShape1dNode } from "./Shape1d.shared";

export function recordElementHistory(runtime: { context: IPluginContext }, payload: { beforeElement: TElement; afterElement: TElement; label: string }) {
  const { context } = runtime;
  const { beforeElement, afterElement, label } = payload;
  if (JSON.stringify(beforeElement) === JSON.stringify(afterElement)) return;
  context.history.record({
    label,
    undo() {
      context.capabilities.updateShapeFromTElement?.(beforeElement);
      context.crdt.patch({ elements: [beforeElement], groups: [] });
    },
    redo() {
      context.capabilities.updateShapeFromTElement?.(afterElement);
      context.crdt.patch({ elements: [afterElement], groups: [] });
    },
  });
}

export function recordCreateHistory(runtime: { context: IPluginContext; setupShapeListeners: (context: IPluginContext, node: TShape1dNode) => void }, payload: { element: TElement; node: TShape1dNode; label: string }) {
  const { context, setupShapeListeners } = runtime;
  const { element, node, label } = payload;
  const snapshot = structuredClone(element);
  context.history.record({
    label,
    undo() {
      const currentNode = context.staticForegroundLayer.findOne((candidate: Konva.Node) => isShape1dNode(candidate) && candidate.id() === snapshot.id);
      currentNode?.destroy();
      context.crdt.deleteById({ elementIds: [snapshot.id] });
      context.setState("selection", context.state.selection.filter((candidate) => candidate.id() !== snapshot.id));
    },
    redo() {
      const existingNode = context.staticForegroundLayer.findOne((candidate: Konva.Node) => isShape1dNode(candidate) && candidate.id() === snapshot.id);
      let currentNode: TShape1dNode;
      if (isShape1dNode(existingNode)) {
        currentNode = existingNode;
      } else {
        currentNode = createShapeFromElement(snapshot);
        setupShapeListeners(context, currentNode);
        currentNode.setDraggable(true);
        context.staticForegroundLayer.add(currentNode);
      }
      context.capabilities.updateShapeFromTElement?.(snapshot);
      context.crdt.patch({ elements: [snapshot], groups: [] });
      context.setState("selection", [currentNode]);
    },
  });
  context.setState("selection", [node]);
}
