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

function filterSelection(
  render: RenderService,
  selection: Array<Group | Shape<ShapeConfig>>,
) {
  let subSelection = selection.find((node) => node.getParent() instanceof render.Group);
  if (!subSelection) {
    return selection.filter((node) => node.getStage() !== null);
  }

  const findDeepestSubSelection = () => {
    const deeperSubSelection = selection.find((node) => node.getParent() === subSelection);
    if (!deeperSubSelection) {
      return;
    }

    subSelection = deeperSubSelection;
    findDeepestSubSelection();
  };

  findDeepestSubSelection();

  return subSelection && subSelection.getStage() !== null ? [subSelection] : [];
}

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
  return collectSerializableShapes(render, nodes)
    .map((node) => editor.toElement(node))
    .filter((element): element is TElement => element !== null);
}

function applyElements(editor: EditorService, elements: TElement[]) {
  elements.forEach((element) => {
    editor.updateShapeFromTElement(element);
  });
}

function syncTransformer(args: {
  render: RenderService;
  editor: EditorService;
  selection: SelectionService;
  transformer: Konva.Transformer;
}) {
  if (args.editor.editingTextId !== null || args.editor.editingShape1dId !== null) {
    args.transformer.setNodes([]);
    args.transformer.update();
    args.render.dynamicLayer.batchDraw();
    return;
  }

  const filteredSelection = filterSelection(args.render, args.selection.selection);
  const isSingleGroupSelection = filteredSelection.length === 1 && filteredSelection[0] instanceof args.render.Group;
  const isMultiSelection = filteredSelection.length > 1;
  const hasTextOnly = filteredSelection.length > 0 && filteredSelection.every((node) => node instanceof args.render.Text);
  const useCornerAnchors = isSingleGroupSelection || hasTextOnly || isMultiSelection;

  args.transformer.borderEnabled(!isSingleGroupSelection);
  args.transformer.borderDash(isMultiSelection ? [2, 2] : [0, 0]);
  args.transformer.keepRatio(useCornerAnchors);
  args.transformer.enabledAnchors(useCornerAnchors ? [...GROUP_ANCHORS] : [...DEFAULT_ANCHORS]);
  args.transformer.setNodes(filteredSelection);
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
          beforeElements = serializeSelection(editor, render, transformer?.getNodes() ?? []);
        });

        transformer.on("transformend", () => {
          if (!transformer) {
            return;
          }

          const afterElements = serializeSelection(editor, render, transformer.getNodes());
          if (afterElements.length === 0) {
            return;
          }

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
              refreshTransformer();
              crdt.patch({ elements: undoElements, groups: [] });
            },
            redo: () => {
              applyElements(editor, redoElements);
              refreshTransformer();
              crdt.patch({ elements: redoElements, groups: [] });
            },
          });
        });

        refreshTransformer();

        selection.hooks.change.tap(() => {
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
