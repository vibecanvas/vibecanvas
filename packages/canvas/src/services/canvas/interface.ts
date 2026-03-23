import { Group } from "konva/lib/Group";
import { Shape, ShapeConfig } from "konva/lib/Shape";
import { CanvasMode, Theme } from "./enum";

export interface IState {
  mode: CanvasMode;
  theme: Theme;
  selection: (Group | Shape<ShapeConfig>)[];
  editingTextId: string | null;
}
