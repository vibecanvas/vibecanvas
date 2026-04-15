import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { TEditorToolCanvasPoint } from "src/services/editor/EditorService";
import { fxCreatePenDataFromStrokePoints } from "./fn.math";

export type TArgsCreatePenDraftElement = {
  id: string;
  now: number;
  points: TEditorToolCanvasPoint[];
};

export function fxCreatePenDraftElement(args: TArgsCreatePenDraftElement): TElement {
  const penData = fxCreatePenDataFromStrokePoints({
    points: args.points,
  });
  if (!penData) {
    throw new Error("Failed to create pen draft data");
  }

  return {
    id: args.id,
    x: penData.x,
    y: penData.y,
    rotation: 0,
    zIndex: "",
    parentGroupId: null,
    bindings: [],
    locked: false,
    createdAt: args.now,
    updatedAt: args.now,
    data: penData,
    style: {
      backgroundColor: "black",
    },
  };
}
