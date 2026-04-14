import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";
import type { HistoryService } from "../../services/history/HistoryService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import type { IHooks, TElementPointerEvent } from "../../runtime";
import { fxSerializeSubtreeElements } from "./fn.serialize-subtree-elements";

export type TPortalSetupGroupNode = {
  crdt: CrdtService;
  canvasRegistry: CanvasRegistryService;
  history: HistoryService;
  render: SceneService;
  selection: SelectionService;
  hooks: IHooks;
  Shape: typeof Konva.Shape;
  refreshBoundaries: () => void;
  startCloneDrag: (group: Konva.Group) => void;
  createThrottledPatch: (callback: (elements: TElement[]) => void) => (elements: TElement[]) => void;
};

export type TArgsSetupGroupNode = {
  group: Konva.Group;
};

export function txSetupGroupNode(
  portal: TPortalSetupGroupNode,
  args: TArgsSetupGroupNode,
) {
  if (args.group.getAttr("vcGroupNodeSetup") === true) {
    return args.group;
  }

  args.group.setAttr("vcGroupNodeSetup", true);
  args.group.draggable(true);

  let beforeElements: TElement[] = [];
  let isCloneDrag = false;
  const throttledPatch = portal.createThrottledPatch((elements) => {
    portal.crdt.patch({ elements, groups: [] });
  });

  args.group.off("pointerclick pointerdown dragstart pointerdblclick dragmove dragend transform");

  args.group.on("pointerclick", (event) => {
    if (portal.selection.mode !== "select") {
      return;
    }

    portal.hooks.elementPointerClick.call(event as TElementPointerEvent);
  });

  args.group.on("pointerdown dragstart", (event) => {
    if (portal.selection.mode !== "select") {
      try {
        if (args.group.isDragging()) {
          args.group.stopDrag();
        }
      } catch {
        return;
      }
      return;
    }

    if (event.type === "pointerdown") {
      const earlyExit = portal.hooks.elementPointerDown.call(event as TElementPointerEvent);
      if (earlyExit) {
        event.cancelBubble = true;
      }
      return;
    }

    if (event.evt?.altKey) {
      isCloneDrag = true;
      try {
        if (args.group.isDragging()) {
          args.group.stopDrag();
        }
      } catch {
        return;
      }
      portal.startCloneDrag(args.group);
      return;
    }

    beforeElements = fxSerializeSubtreeElements({
      canvasRegistry: portal.canvasRegistry,
      Shape: portal.Shape,
      group: args.group,
    }).map((element) => structuredClone(element));
  });

  args.group.on("pointerdblclick", (event) => {
    if (portal.selection.mode !== "select") {
      return;
    }

    const earlyExit = portal.hooks.elementPointerDoubleClick.call(event as TElementPointerEvent);
    if (earlyExit) {
      event.cancelBubble = true;
    }
  });

  args.group.on("dragmove", () => {
    if (isCloneDrag) {
      isCloneDrag = false;
      return;
    }

    portal.refreshBoundaries();
    throttledPatch(fxSerializeSubtreeElements({
      canvasRegistry: portal.canvasRegistry,
      Shape: portal.Shape,
      group: args.group,
    }));
  });

  args.group.on("transform", () => {
    portal.refreshBoundaries();
  });

  args.group.on("dragend", () => {
    if (isCloneDrag) {
      isCloneDrag = false;
      beforeElements = [];
      return;
    }

    const afterElements = fxSerializeSubtreeElements({
      canvasRegistry: portal.canvasRegistry,
      Shape: portal.Shape,
      group: args.group,
    }).map((element) => structuredClone(element));
    portal.crdt.patch({ elements: afterElements, groups: [] });

    if (beforeElements.length === 0 || afterElements.length === 0) {
      beforeElements = [];
      return;
    }

    const beforeById = new Map(beforeElements.map((element) => [element.id, element]));
    const didMove = afterElements.some((element) => {
      const before = beforeById.get(element.id);
      return before && (before.x !== element.x || before.y !== element.y);
    });

    if (!didMove) {
      beforeElements = [];
      return;
    }

    const undoElements = beforeElements.map((element) => structuredClone(element));
    const redoElements = afterElements.map((element) => structuredClone(element));
    beforeElements = [];

    portal.refreshBoundaries();

    portal.history.record({
      label: "drag-group",
      undo() {
        undoElements.forEach((element) => {
          portal.canvasRegistry.updateElement(element);
        });
        portal.crdt.patch({ elements: undoElements, groups: [] });
      },
      redo() {
        redoElements.forEach((element) => {
          portal.canvasRegistry.updateElement(element);
        });
        portal.crdt.patch({ elements: redoElements, groups: [] });
      },
    });
  });

  return args.group;
}
