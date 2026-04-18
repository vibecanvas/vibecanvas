import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { SceneService } from "../services/scene/SceneService";
import type { SelectionService } from "../services/selection/SelectionService";
import { isKonvaGroup, isKonvaShape } from "./GUARDS";
import type { TCanvasSemanticsEditor } from "./fn.canvas-node-semantics";
import { fnFilterSelection } from "./fn.filter-selection";

export type TSelectionStyleElementEditor = TCanvasSemanticsEditor & {
  toElement(node: Konva.Node): TElement | null;
};

export type TPortalResolveSelectionStyleElements = {
  editor: TSelectionStyleElementEditor;
  scene: SceneService;
  selection: SelectionService;
};


export type TPortalResolveFocusedSelectionStyleElements = {
  Konva: typeof Konva;
  editor: TSelectionStyleElementEditor;
  scene: SceneService;
};

export type TArgsResolveFocusedSelectionStyleElements = {
  focusedId: string | null;
};

function collectSelectionStyleElements(args: {
  editor: TSelectionStyleElementEditor;
  rootNodes: Konva.Node[];
}) {
  const shapeNodes: Konva.Shape[] = [];
  const seenNodeIds = new Set<string>();

  const visitNode = (node: Konva.Group | Konva.Shape) => {
    if (seenNodeIds.has(node.id())) {
      return;
    }

    seenNodeIds.add(node.id());

    if (isKonvaGroup(node)) {
      node.getChildren().forEach((child) => {
        if (isKonvaGroup(child) || isKonvaShape(child)) {
          visitNode(child);
        }
      });
      return;
    }

    shapeNodes.push(node);
  };

  args.rootNodes.filter(n => isKonvaGroup(n) || isKonvaShape(n)).forEach(n => visitNode(n));

  const seenElementIds = new Set<string>();
  return shapeNodes
    .map((node) => args.editor.toElement(node))
    .filter((element): element is TElement => Boolean(element))
    .filter((element) => {
      if (seenElementIds.has(element.id)) {
        return false;
      }

      seenElementIds.add(element.id);
      return true;
    });
}

export function fxResolveSelectionStyleElements(
  portal: TPortalResolveSelectionStyleElements,
) {

  const filteredSelection = fnFilterSelection({
    editor: portal.editor,
    selection: portal.selection.selection,
  });
  const rootNodes = filteredSelection.filter((node, index) => {
    return !filteredSelection.some((candidate, candidateIndex) => {
      if (candidateIndex === index) {
        return false;
      }

      return node.getAncestors().includes(candidate);
    });
  });

  return collectSelectionStyleElements({
    editor: portal.editor,
    rootNodes: rootNodes
  });
}

export function fxResolveFocusedSelectionStyleElements(
  portal: TPortalResolveFocusedSelectionStyleElements,
  args: TArgsResolveFocusedSelectionStyleElements,
) {
  if (args.focusedId === null) {
    return [];
  }

  const focusedNode = portal.scene.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return (isKonvaGroup(candidate) || isKonvaShape(candidate))
      && candidate.id() === args.focusedId;
  });

  if (!isKonvaGroup(focusedNode) && !isKonvaShape(focusedNode)) {
    return [];
  }

  return collectSelectionStyleElements({
    editor: portal.editor,
    rootNodes: [focusedNode],
  });
}
