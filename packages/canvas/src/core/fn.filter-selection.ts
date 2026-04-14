import type { Group } from "konva/lib/Group";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import type { EditorService } from "../new-services/editor/EditorService";
import { fxIsCanvasGroupNode } from "./fn.canvas-node-semantics";
import type Konva from "konva";


export type TArgsFilterSelection = {
  Group: typeof Konva.Group;
  editor?: EditorService;
  selection: Array<Group | Shape<ShapeConfig>>;
};

export function fxFilterSelection(args: TArgsFilterSelection) {
  let subSelection = args.selection.find((node) => {
    if (!args.editor) {
      return node.getParent() instanceof args.Group
    }

    return fxIsCanvasGroupNode({ editor: args.editor, node: node.getParent() });
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
