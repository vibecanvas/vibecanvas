import type Konva from "konva";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { fxFilterSelection } from "./fx.filter-selection";
import { fnIsUnsupportedSelectionStyleElement } from "./fn.selection-style-menu";
import type { EditorService } from "../new-services/editor/EditorService";
import type { SceneService } from "../new-services/scene/SceneService";
import type { SelectionService } from "../new-services/selection/SelectionService";

export type TPortalResolveSelectionStyleElements = {
  Konva: typeof Konva;
  editor: EditorService;
  scene: SceneService;
  selection: SelectionService;
};

export type TArgsResolveSelectionStyleElements = Record<string, never>;

export type TPortalResolveFocusedSelectionStyleElements = {
  Konva: typeof Konva;
  editor: EditorService;
  scene: SceneService;
};

export type TArgsResolveFocusedSelectionStyleElements = {
  focusedId: string | null;
};

function collectSelectionStyleElements(args: {
  Konva: typeof Konva;
  editor: EditorService;
  rootNodes: Array<Konva.Group | Konva.Shape>;
}) {
  const shapeNodes: Konva.Shape[] = [];
  const seenNodeIds = new Set<string>();

  const visitNode = (node: Konva.Group | Konva.Shape) => {
    if (seenNodeIds.has(node.id())) {
      return;
    }

    seenNodeIds.add(node.id());

    if (node instanceof args.Konva.Group) {
      node.getChildren().forEach((child) => {
        if (child instanceof args.Konva.Group || child instanceof args.Konva.Shape) {
          visitNode(child);
        }
      });
      return;
    }

    shapeNodes.push(node);
  };

  args.rootNodes.forEach(visitNode);

  const seenElementIds = new Set<string>();
  return shapeNodes
    .map((node) => args.editor.toElement(node))
    .filter((element): element is TElement => Boolean(element))
    .filter((element) => !fnIsUnsupportedSelectionStyleElement(element))
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
  args: TArgsResolveSelectionStyleElements,
) {
  void args;

  const filteredSelection = fxFilterSelection({
    Konva: portal.Konva,
  }, {
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
    Konva: portal.Konva,
    editor: portal.editor,
    rootNodes,
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
    return (candidate instanceof portal.Konva.Group || candidate instanceof portal.Konva.Shape)
      && candidate.id() === args.focusedId;
  });

  if (!(focusedNode instanceof portal.Konva.Group) && !(focusedNode instanceof portal.Konva.Shape)) {
    return [];
  }

  return collectSelectionStyleElements({
    Konva: portal.Konva,
    editor: portal.editor,
    rootNodes: [focusedNode],
  });
}
