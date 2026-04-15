import type Konva from "konva";
import type { Group } from "konva/lib/Group";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { CanvasRegistryService } from "../../services";

export type TPortalTxDispatchSelectionTransformHooks = {
  canvasRegistry: CanvasRegistryService;
};

export type TArgsTxDispatchSelectionTransformHooks<TArgs extends { node: Konva.Node; element: TElement; selection: Array<Group | Shape<ShapeConfig>> }> = {
  selection: Array<Group | Shape<ShapeConfig>>;
  createArgs: (node: Group | Shape<ShapeConfig>, element: TElement) => TArgs;
  getHook: (definition: ReturnType<CanvasRegistryService["getMatchingElementDefinitionsByNode"]>[number]) => ((args: TArgs) => { cancel: boolean; crdt: boolean } | void) | undefined;
};

export function txDispatchSelectionTransformHooks<TArgs extends { node: Konva.Node; element: TElement; selection: Array<Group | Shape<ShapeConfig>> }>(portal: TPortalTxDispatchSelectionTransformHooks, args: TArgsTxDispatchSelectionTransformHooks<TArgs>) {
  let result = { cancel: false, crdt: false };
  const handledNodeIds = new Set<string>();

  for (const node of args.selection) {
    const element = portal.canvasRegistry.toElement(node);
    if (!element) {
      continue;
    }

    const hookArgs = args.createArgs(node, element);
    const definitions = portal.canvasRegistry.getMatchingElementDefinitionsByNode(node);
    let handledNode = false;
    for (const definition of definitions) {
      const hookResult = args.getHook(definition)?.(hookArgs);
      if (hookResult) {
        result = {
          cancel: result.cancel || hookResult.cancel,
          crdt: result.crdt || hookResult.crdt,
        };
      }
      handledNode = handledNode || Boolean(hookResult?.cancel);
    }

    if (handledNode) {
      handledNodeIds.add(node.id());
    }
  }

  return {
    ...result,
    handledNodeIds,
  };
}
