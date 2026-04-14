import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { Node } from "konva/lib/Node";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { SceneService } from "../../new-services/scene/SceneService";

export type TArgsSerializeSubtreeElements = {
  editor: EditorService;
  render: SceneService;
  group: Konva.Group;
};

export function fxSerializeSubtreeElements(args: TArgsSerializeSubtreeElements) {
  return args.group.find((node: Node) => node instanceof args.render.Shape)
    .map((node) => args.editor.toElement(node))
    .filter((element): element is TElement => element !== null);
}
