import { Group } from "konva/lib/Group";
import { Shape, ShapeConfig } from "konva/lib/Shape";
import { CanvasMode, Theme } from "./enum";

export type TImageUploadFormat = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export type TUploadImage = (args: {
  base64: string;
  format: TImageUploadFormat;
}) => Promise<{ url: string }>;

export type TCloneImage = (args: {
  url: string;
}) => Promise<{ url: string }>;

export type TDeleteImage = (args: {
  url: string;
}) => Promise<{ ok: true }>;

export interface IState {
  mode: CanvasMode;
  theme: Theme;
  selection: (Group | Shape<ShapeConfig>)[];
  editingTextId: string | null;
  editingShape1dId: string | null;
}
