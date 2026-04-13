import type Konva from "konva";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { fxFilterSelection } from "./fn.filter-selection";
import { fxIsUnsupportedSelectionStyleElement } from "./fn.selection-style-menu";
import type { EditorService } from "../new-services/editor/EditorService";
import type { RenderService } from "../new-services/render/RenderService";
import type { SelectionService } from "../new-services/selection/SelectionService";

export type TPortalResolveSelectionStyleElements = {
  editor: EditorService;
  render: RenderService;
  selection: SelectionService;
};

export type TArgsResolveSelectionStyleElements = Record<string, never>;

export type TPortalResolveFocusedSelectionStyleElements = {
  editor: EditorService;
  render: RenderService;
};

export type TArgsResolveFocusedSelectionStyleElements = {
  focusedId: string | null;
};

function collectSelectionStyleElements(args: {
  editor: EditorService;
  render: RenderService;
  rootNodes: Array<Konva.Group | Konva.Shape>;
}) {
  const shapeNodes: Konva.Shape[] = [];
  const seenNodeIds = new Set<string>();

  const visitNode = (node: Konva.Group | Konva.Shape) => {
    if (seenNodeIds.has(node.id())) {
      return;
    }

    seenNodeIds.add(node.id());

    if (node instanceof args.render.Group) {
      node.getChildren().forEach((child) => {
        if (child instanceof args.render.Group || child instanceof args.render.Shape) {
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
    .filter((element) => !fxIsUnsupportedSelectionStyleElement(element))
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
    render: portal.render,
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
    render: portal.render,
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

  const focusedNode = portal.render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return (candidate instanceof portal.render.Group || candidate instanceof portal.render.Shape)
      && candidate.id() === args.focusedId;
  });

  if (!(focusedNode instanceof portal.render.Group) && !(focusedNode instanceof portal.render.Shape)) {
    return [];
  }

  return collectSelectionStyleElements({
    editor: portal.editor,
    render: portal.render,
    rootNodes: [focusedNode],
  });
}
