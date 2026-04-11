import type { IService } from "@vibecanvas/runtime";
import { CanvasMode } from "../../services/canvas/enum";
import type { Group } from "konva/lib/Group";
import type { Shape, ShapeConfig } from "konva/lib/Shape";

/**
 * Holds selection and tool state.
 * Owns mode, active selection, and focused node id.
 */
export class SelectionService implements IService {
  readonly name = "selection";

  mode = CanvasMode.SELECT;
  selection: Array<Group | Shape<ShapeConfig>> = [];
  focusedId: string | null = null;
}
