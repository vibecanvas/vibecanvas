import { throttle } from "@solid-primitives/scheduled";
import type { TElement } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import { collectHostedWidgetSelectionShapes, getHostedWidgetPointerWorldPoint } from "../shared/hosted-widget.shared";
import type { IPluginContext } from "../shared/interface";
import { getWorldPosition, setWorldPosition } from "../shared/node-space";

export function beginHostedDomDrag(
  runtime: {
    context: IPluginContext;
    node: Konva.Rect;
    cleanupDrag: (() => void) | null;
    setCleanupDrag: (cleanup: (() => void) | null) => void;
    selectHostedNode: (context: IPluginContext, node: Konva.Rect, event: PointerEvent | MouseEvent) => void;
    filterSelection: (selection: Array<Konva.Group | Konva.Shape>) => Array<Konva.Group | Konva.Shape>;
    isHostedNode: (node: Konva.Node | null | undefined) => node is Konva.Rect;
    syncMountedNode: (node: Konva.Rect) => void;
  },
  event: PointerEvent | MouseEvent,
) {
  const { context, node } = runtime;
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();

  runtime.selectHostedNode(context, node, event);
  runtime.cleanupDrag?.();

  const activeSelection = runtime.filterSelection(
    context.state.selection.some((candidate) => candidate.id() === node.id())
      ? context.state.selection
      : [node],
  );

  const startPointerWorld = getHostedWidgetPointerWorldPoint(context, { x: event.clientX, y: event.clientY });
  const pointerOffsets = new Map(activeSelection.map((candidate) => {
    const position = getWorldPosition(candidate);
    return [candidate.id(), { x: position.x - startPointerWorld.x, y: position.y - startPointerWorld.y }];
  }));
  const beforeElements = collectHostedWidgetSelectionShapes(activeSelection)
    .map((shape) => context.capabilities.toElement?.(shape))
    .filter((element): element is TElement => Boolean(element))
    .map((element) => structuredClone(element));
  const throttledPatch = throttle((elements: TElement[]) => {
    context.crdt.patch({ elements, groups: [] });
  }, 100);

  const onPointerMove = (moveEvent: PointerEvent | MouseEvent) => {
    const pointerWorld = getHostedWidgetPointerWorldPoint(context, { x: moveEvent.clientX, y: moveEvent.clientY });

    activeSelection.forEach((candidate) => {
      const offset = pointerOffsets.get(candidate.id());
      if (!offset) return;
      setWorldPosition(candidate, { x: pointerWorld.x + offset.x, y: pointerWorld.y + offset.y });
      if (candidate instanceof Konva.Rect && runtime.isHostedNode(candidate)) {
        runtime.syncMountedNode(candidate);
      }
    });

    const liveElements = collectHostedWidgetSelectionShapes(activeSelection)
      .map((shape) => context.capabilities.toElement?.(shape))
      .filter((element): element is TElement => Boolean(element))
      .map((element) => structuredClone(element));
    if (liveElements.length > 0) {
      throttledPatch(liveElements);
    }

    context.stage.batchDraw();
  };

  const onPointerUp = () => {
    window.removeEventListener("pointermove", onPointerMove as EventListener);
    window.removeEventListener("pointerup", onPointerUp);
    runtime.setCleanupDrag(null);

    const afterElements = collectHostedWidgetSelectionShapes(activeSelection)
      .map((shape) => context.capabilities.toElement?.(shape))
      .filter((element): element is TElement => Boolean(element))
      .map((element) => structuredClone(element));

    if (afterElements.length === 0) return;
    context.crdt.patch({ elements: afterElements, groups: [] });
    context.history.record({
      label: "drag-hosted-widget",
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
  window.addEventListener("pointerup", onPointerUp, { once: true });
  runtime.setCleanupDrag(() => {
    window.removeEventListener("pointermove", onPointerMove as EventListener);
    window.removeEventListener("pointerup", onPointerUp);
  });
}
