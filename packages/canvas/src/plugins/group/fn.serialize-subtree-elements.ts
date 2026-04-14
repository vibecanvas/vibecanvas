import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { Node } from "konva/lib/Node";
import type { Shape } from "konva/lib/Shape";
import type { EditorService } from "../../services/editor/EditorService";

export type TArgsSerializeSubtreeElements = {
  editor: EditorService;
  Shape: typeof Shape;
  group: Konva.Group;
};

export function fxSerializeSubtreeElements(args: TArgsSerializeSubtreeElements) {
  return args.group.find((node: Node) => node instanceof args.Shape)
    .map((node) => args.editor.toElement(node))
    .filter((element): element is TElement => element !== null);
}
