import type { Group } from "konva/lib/Group";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import type { RenderService } from "../new-services/render/RenderService";

export type TArgsFilterSelection = {
  render: RenderService;
  selection: Array<Group | Shape<ShapeConfig>>;
};

export function fxFilterSelection(args: TArgsFilterSelection) {
  let subSelection = args.selection.find((node) => node.getParent() instanceof args.render.Group);
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
