import { throttle } from "@solid-primitives/scheduled";
import type { TElement } from "@vibecanvas/automerge-service/types/canvas-doc";
import type Konva from "konva";
import type { IPluginContext } from "../shared/interface";
import { getWorldPosition, setWorldPosition } from "../shared/node-space";
import {
  collectHostedWidgetSelectionShapes,
  getHostedWidgetPointerWorldPoint,
} from "../shared/hosted-widget.shared";
import { TransformPlugin } from "../Transform/Transform.plugin";
import { cloneElements } from "./IframeBrowserWidget.helpers";

export function beginDomDrag(runtime: {
  cleanupDrag: () => void;
  setCleanupDrag: (cleanup: (() => void) | null) => void;
  context: IPluginContext;
  node: Konva.Rect;
  selectNode: (context: IPluginContext, node: Konva.Rect, event: PointerEvent | MouseEvent) => void;
  isBrowserNode: (node: Konva.Node | null | undefined) => node is Konva.Rect;
  syncMountedNode: (node: Konva.Rect) => void;
}, event: PointerEvent | MouseEvent) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();

  const { context, node } = runtime;
  runtime.selectNode(context, node, event);
  runtime.cleanupDrag();

  const activeSelection = TransformPlugin.filterSelection(
    context.state.selection.some((candidate) => candidate.id() === node.id())
      ? context.state.selection
      : [node],
  );

  const startPointerWorld = getHostedWidgetPointerWorldPoint(context, { x: event.clientX, y: event.clientY });
  const pointerOffsets = new Map(
    activeSelection.map((candidate) => {
      const position = getWorldPosition(candidate);
      return [candidate.id(), { x: position.x - startPointerWorld.x, y: position.y - startPointerWorld.y }];
    }),
  );

  const beforeElements = cloneElements(
    collectHostedWidgetSelectionShapes(activeSelection).map((shape) => context.capabilities.toElement?.(shape)),
  );

  const throttledPatch = throttle((elements: TElement[]) => {
    context.crdt.patch({ elements, groups: [] });
  }, 100);

  const onPointerMove = (moveEvent: PointerEvent | MouseEvent) => {
    const pointerWorld = getHostedWidgetPointerWorldPoint(context, { x: moveEvent.clientX, y: moveEvent.clientY });

    activeSelection.forEach((candidate) => {
      const offset = pointerOffsets.get(candidate.id());
      if (!offset) return;
      setWorldPosition(candidate, { x: pointerWorld.x + offset.x, y: pointerWorld.y + offset.y });
      if (runtime.isBrowserNode(candidate)) runtime.syncMountedNode(candidate);
    });

    const liveElements = cloneElements(
      collectHostedWidgetSelectionShapes(activeSelection).map((shape) => context.capabilities.toElement?.(shape)),
    );
    if (liveElements.length > 0) throttledPatch(liveElements);
    context.stage.batchDraw();
  };

  let finalized = false;
  const finalizeDrag = () => {
    if (finalized) return;
    finalized = true;
    window.removeEventListener("pointermove", onPointerMove as EventListener);
    window.removeEventListener("pointerup", finalizeDrag);
    window.removeEventListener("pointercancel", finalizeDrag);
    window.removeEventListener("blur", finalizeDrag);
    runtime.setCleanupDrag(null);

    const afterElements = cloneElements(
      collectHostedWidgetSelectionShapes(activeSelection).map((shape) => context.capabilities.toElement?.(shape)),
    );
    if (afterElements.length === 0) return;

    context.crdt.patch({ elements: afterElements, groups: [] });
    context.history.record({
      label: "drag-browser-widget",
      undo: () => {
        beforeElements.forEach((element) => context.capabilities.updateShapeFromTElement?.(element));
        context.crdt.patch({ elements: beforeElements, groups: [] });
      },
      redo: () => {
        afterElements.forEach((element) => context.capabilities.updateShapeFromTElement?.(element));
        context.crdt.patch({ elements: afterElements, groups: [] });
      },
    });
  };

  window.addEventListener("pointermove", onPointerMove as EventListener);
  window.addEventListener("pointerup", finalizeDrag, { once: true });
  window.addEventListener("pointercancel", finalizeDrag, { once: true });
  window.addEventListener("blur", finalizeDrag, { once: true });
  runtime.setCleanupDrag(() => {
    window.removeEventListener("pointermove", onPointerMove as EventListener);
    window.removeEventListener("pointerup", finalizeDrag);
    window.removeEventListener("pointercancel", finalizeDrag);
    window.removeEventListener("blur", finalizeDrag);
    finalized = true;
  });
}
