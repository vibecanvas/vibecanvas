export type CanvasRenderer = "fabric" | "pixi" | "konva";

export const DEFAULT_CANVAS_RENDERER: CanvasRenderer = "konva";

export function isCanvasRenderer(value: string | null | undefined): value is CanvasRenderer {
  return value === "fabric" || value === "pixi" || value === "konva";
}
