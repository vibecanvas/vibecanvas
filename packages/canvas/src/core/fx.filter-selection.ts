import type Konva from "konva";
import type { Group } from "konva/lib/Group";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import { fxIsCanvasGroupNode, type TCanvasSemanticsEditor } from "./fx.canvas-node-semantics";

export type TPortalFilterSelection = {
  Konva: typeof Konva;
};

export type TArgsFilterSelection = {
  editor?: TCanvasSemanticsEditor;
  selection: Array<Group | Shape<ShapeConfig>>;
};

export function fxFilterSelection(
  portal: TPortalFilterSelection,
  args: TArgsFilterSelection,
) {
  let subSelection = args.selection.find((node) => {
    if (!args.editor) {
      return node.getParent() instanceof portal.Konva.Group;
    }

    return fxIsCanvasGroupNode({}, { editor: args.editor, node: node.getParent() });
  });

  if (!subSelection) {
    return args.selection.filter((node) => node.getStage() !== null);
  }

  const findDeepestSubSelection = () => {
    const deeperSubSelection = args.selection.find((node) => node.getParent() === subSelection);
    if (!deeperSubSelection) {
      return;
    }

    subSelection = deeperSubSelection;
    findDeepestSubSelection();
  };

  findDeepestSubSelection();

  return subSelection && subSelection.getStage() !== null ? [subSelection] : [];
}
