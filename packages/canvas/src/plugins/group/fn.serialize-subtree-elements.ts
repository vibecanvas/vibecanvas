import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { Node } from "konva/lib/Node";
import type { Shape } from "konva/lib/Shape";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";

export type TArgsSerializeSubtreeElements = {
  canvasRegistry: CanvasRegistryService;
  Shape: typeof Shape;
  group: Konva.Group;
};

export function fxSerializeSubtreeElements(args: TArgsSerializeSubtreeElements) {
  return args.group.find((node: Node) => node instanceof args.Shape)
    .map((node) => args.canvasRegistry.toElement(node))
    .filter((element): element is TElement => element !== null);
}
