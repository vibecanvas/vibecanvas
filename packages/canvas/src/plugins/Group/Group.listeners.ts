import Konva from "konva";
import { throttle } from "@solid-primitives/scheduled";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { CustomEvents } from "../../custom-events";
import { CanvasMode } from "../../services/canvas/enum";
import { startSelectionCloneDrag } from "../shared/clone-drag";
import type { IPluginContext } from "../shared/interface";

type GroupListenerRuntime = {
  context: IPluginContext;
  updateBoundaries?: () => void;
  createCloneDrag?: (context: IPluginContext, group: Konva.Group) => void;
  startSingleCloneDrag: (context: IPluginContext, group: Konva.Group) => void;
};

function setupGroupListeners(runtime: GroupListenerRuntime, group: Konva.Group) {
  const { context } = runtime;
  if (group.getAttr("vcGroupListenersSetup")) return;
  group.setAttr("vcGroupListenersSetup", true);

  let isCloneDrag = false;

  group.on("pointerclick", (event) => {
    if (context.state.mode !== CanvasMode.SELECT) return;
    context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERCLICK, event);
  });

  group.on("pointerdblclick", (event) => {
    if (context.state.mode !== CanvasMode.SELECT) return;
    const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDBLCLICK, event);
    if (earlyExit) event.cancelBubble = true;
  });

  group.on("pointerdown dragstart", (event) => {
    if (context.state.mode !== CanvasMode.SELECT) {
      group.stopDrag();
      return;
    }

    if (event.type === "pointerdown") {
      const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDOWN, event);
      if (earlyExit) event.cancelBubble = true;
    }

    if (event.type === "dragstart" && event.evt?.altKey) {
      isCloneDrag = true;
      try {
        if (group.isDragging()) {
          group.stopDrag();
        }
      } catch {
        // ignore Konva drag-state mismatch in synthetic paths
      }

      if (startSelectionCloneDrag(context, group)) {
        isCloneDrag = false;
        return;
      }

      if (runtime.createCloneDrag) {
        runtime.createCloneDrag(context, group);
      } else {
        runtime.startSingleCloneDrag(context, group);
      }
    }
  });

  const throttledPatch = throttle((elements: TElement[]) => {
    context.crdt.patch({ elements, groups: [] });
  }, 100);

  group.on("dragmove transform", (event) => {
    if (event.type === "dragmove" && isCloneDrag) {
      isCloneDrag = false;
      return;
    }

    runtime.updateBoundaries?.();

    if (event.currentTarget instanceof Konva.Group && event.type === "dragmove") {
      const childElements = event.currentTarget
        .find((node: Konva.Node) => node instanceof Konva.Shape)
        .map((node) => context.capabilities.toElement?.(node as Konva.Shape))
        .filter(Boolean) as TElement[];
      throttledPatch(childElements);
      event.cancelBubble = true;
    }
  });
}

export { setupGroupListeners };
