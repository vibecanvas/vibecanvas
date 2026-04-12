import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { Node } from "konva/lib/Node";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { RenderService } from "../../new-services/render/RenderService";

export type TArgsSerializeSubtreeElements = {
  editor: EditorService;
  render: RenderService;
  group: Konva.Group;
};

export function fxSerializeSubtreeElements(args: TArgsSerializeSubtreeElements) {
  return args.group.find((node: Node) => node instanceof args.render.Shape)
    .map((node) => args.editor.toElement(node))
    .filter((element): element is TElement => element !== null);
}
