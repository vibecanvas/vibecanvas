import type { IPlugin } from "@vibecanvas/runtime";
import type Konva from "konva";
import type { Group } from "konva/lib/Group";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { IHooks } from "../../runtime";
import { fxFilterSelection } from "../../core/fn.filter-selection";

const GROUP_ANCHORS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;

const DEFAULT_ANCHORS = [
  "top-left",
  "top-center",
  "top-right",
  "middle-right",
  "middle-left",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;

function collectSerializableShapes(
  render: RenderService,
  nodes: Konva.Node[],
): Array<Shape<ShapeConfig>> {
  return nodes.flatMap((node) => {
    if (node instanceof render.Group) {
      return collectSerializableShapes(render, node.getChildren());
    }

    if (node instanceof render.Shape) {
      return [node];
    }

    return [];
  });
}

function serializeSelection(editor: EditorService, render: RenderService, nodes: Konva.Node[]) {
  const shapes = collectSerializableShapes(render, nodes);
  const elements = shapes
    .map((node) => {
      const element = editor.toElement(node);
      console.debug("[transform] serialize node", {
        id: node.id(),
        className: node.getClassName(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
        rotation: node.rotation(),
        width: "width" in node ? (node as Konva.Shape).width?.() : undefined,
        height: "height" in node ? (node as Konva.Shape).height?.() : undefined,
        serialized: element,
      });
      return element;
    })
    .filter((element): element is TElement => element !== null);

  console.debug("[transform] serialize selection summary", {
    nodeCount: nodes.length,
    shapeCount: shapes.length,
    elementCount: elements.length,
    elementTypes: elements.map((element) => element.data.type),
  });

  return elements;
}

function applyElements(editor: EditorService, elements: TElement[]) {
  elements.forEach((element) => {
    const didUpdate = editor.updateShapeFromTElement(element);
    console.debug("[transform] apply element", {
      id: element.id,
      type: element.data.type,
      didUpdate,
      x: element.x,
      y: element.y,
      rotation: element.rotation,
    });
  });
}

function normalizeSelectedGroupTransforms(render: RenderService, nodes: Konva.Node[]) {
  nodes.forEach((node) => {
    if (!(node instanceof render.Group)) {
      return;
    }

    node.scale({ x: 1, y: 1 });
    node.rotation(0);
    node.skew({ x: 0, y: 0 });
  });
}

function refreshSelectedGroups(render: RenderService, selection: SelectionService) {
  selection.selection.forEach((node) => {
    if (node instanceof render.Group) {
      node.fire("transform");
    }
  });
}

function syncTransformer(args: {
  render: RenderService;
  editor: EditorService;
  selection: SelectionService;
  transformer: Konva.Transformer;
}) {
  console.debug("[transform] syncTransformer input", {
    editingTextId: args.editor.editingTextId,
    editingShape1dId: args.editor.editingShape1dId,
    selectionIds: args.selection.selection.map((node) => node.id()),
    selectionClasses: args.selection.selection.map((node) => node.getClassName()),
  });
  if (args.editor.editingTextId !== null || args.editor.editingShape1dId !== null) {
    args.transformer.setNodes([]);
    args.transformer.update();
    args.render.dynamicLayer.batchDraw();
    return;
  }

  const filteredSelection = fxFilterSelection({ render: args.render, selection: args.selection.selection });
  const isSingleGroupSelection = filteredSelection.length === 1 && filteredSelection[0] instanceof args.render.Group;
  const isMultiSelection = filteredSelection.length > 1;
  const hasTextOnly = filteredSelection.length > 0 && filteredSelection.every((node) => node instanceof args.render.Text);
  const useCornerAnchors = isSingleGroupSelection || hasTextOnly || isMultiSelection;

  args.transformer.borderEnabled(!isSingleGroupSelection);
  args.transformer.borderDash(isMultiSelection ? [2, 2] : [0, 0]);
  args.transformer.keepRatio(useCornerAnchors);
  args.transformer.enabledAnchors(useCornerAnchors ? [...GROUP_ANCHORS] : [...DEFAULT_ANCHORS]);
  args.transformer.setNodes(filteredSelection);
  console.debug("[transform] syncTransformer output", {
    filteredSelectionIds: filteredSelection.map((node) => node.id()),
    filteredSelectionClasses: filteredSelection.map((node) => node.getClassName()),
    transformerNodeIds: args.transformer.getNodes().map((node) => node.id()),
    transformerNodeClasses: args.transformer.getNodes().map((node) => node.getClassName()),
  });
  args.transformer.update();
  args.render.dynamicLayer.batchDraw();
}

/**
 * Owns shared transformer UI for current selection.
 * Uses editor registries to serialize and re-apply transformed shapes.
 */
export function createTransformPlugin(): IPlugin<{
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: RenderService;
  selection: SelectionService;
}, IHooks> {
  let transformer: Konva.Transformer | null = null;
  let beforeElements: TElement[] = [];

  return {
    name: "transform",
    apply(ctx) {
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const history = ctx.services.require("history");
      const render = ctx.services.require("render");
      const selection = ctx.services.require("selection");

      const refreshTransformer = () => {
        if (!transformer) {
          return;
        }

        syncTransformer({
          render,
          editor,
          selection,
          transformer,
        });
      };

      ctx.hooks.init.tap(() => {
        transformer = new render.Transformer();
        render.dynamicLayer.add(transformer);
        editor.setTransformer(transformer);

        transformer.on("transformstart", () => {
          console.debug("[transform] transformstart", {
            nodeIds: (transformer?.getNodes() ?? []).map((node) => node.id()),
            nodeClasses: (transformer?.getNodes() ?? []).map((node) => node.getClassName()),
          });
          beforeElements = serializeSelection(editor, render, transformer?.getNodes() ?? []);
        });

        transformer.on("transformend", () => {
          if (!transformer) {
            return;
          }

          console.debug("[transform] transformend before serialize", {
            nodeIds: transformer.getNodes().map((node) => node.id()),
            nodeClasses: transformer.getNodes().map((node) => node.getClassName()),
            scales: transformer.getNodes().map((node) => ({ id: node.id(), scaleX: node.scaleX(), scaleY: node.scaleY(), rotation: node.rotation() })),
          });

          const afterElements = serializeSelection(editor, render, transformer.getNodes());
          if (afterElements.length === 0) {
            console.debug("[transform] transformend no serialized elements");
            return;
          }

          console.debug("[transform] transformend serialized elements", afterElements);
          normalizeSelectedGroupTransforms(render, transformer.getNodes());
          applyElements(editor, afterElements);
          refreshSelectedGroups(render, selection);
          refreshTransformer();
          crdt.patch({ elements: afterElements, groups: [] });

          if (beforeElements.length === 0) {
            return;
          }

          const undoElements = structuredClone(beforeElements);
          const redoElements = structuredClone(afterElements);

          history.record({
            label: "transform",
            undo: () => {
              applyElements(editor, undoElements);
              refreshSelectedGroups(render, selection);
              refreshTransformer();
              crdt.patch({ elements: undoElements, groups: [] });
            },
            redo: () => {
              applyElements(editor, redoElements);
              refreshSelectedGroups(render, selection);
              refreshTransformer();
              crdt.patch({ elements: redoElements, groups: [] });
            },
          });
        });

        refreshTransformer();

        selection.hooks.change.tap(() => {
          console.debug("[transform] selection change", {
            mode: selection.mode,
            selectionIds: selection.selection.map((node) => node.id()),
            selectionClasses: selection.selection.map((node) => node.getClassName()),
          });
          refreshTransformer();
        });
        editor.hooks.editingTextChange.tap(() => {
          refreshTransformer();
        });
        editor.hooks.editingShape1dChange.tap(() => {
          refreshTransformer();
        });
        editor.hooks.toElementRegistryChange.tap(() => {
          refreshTransformer();
        });
        editor.hooks.updateShapeFromTElementRegistryChange.tap(() => {
          refreshTransformer();
        });
      });

      ctx.hooks.destroy.tap(() => {
        editor.setTransformer(null);
        transformer?.destroy();
        transformer = null;
      });
    },
  };
}
