import type { TElement } from "@vibecanvas/shell/automerge/index";
import { DEFAULT_OPACITY, DEFAULT_STROKE, DEFAULT_STROKE_WIDTH, type TPoint, type TShape1dData } from "./Shape1d.shared";

export function createFallbackPreviewElement(payload: { activeTool: "line" | "arrow"; draftElementId: string | null }) {
  return {
    id: payload.draftElementId ?? crypto.randomUUID(),
    x: 0,
    y: 0,
    rotation: 0,
    bindings: [],
    createdAt: Date.now(),
    locked: false,
    parentGroupId: null,
    updatedAt: Date.now(),
    zIndex: "",
    data: { type: payload.activeTool === "arrow" ? "arrow" : "line", lineType: "straight", points: [[0, 0], [0, 0]], startBinding: null, endBinding: null, ...(payload.activeTool === "arrow" ? { startCap: "none", endCap: "arrow" } : {}) } as TShape1dData,
    style: { strokeColor: DEFAULT_STROKE, opacity: DEFAULT_OPACITY, strokeWidth: DEFAULT_STROKE_WIDTH },
  } satisfies TElement;
}

export function createDraftElement(payload: { activeTool: "line" | "arrow"; draftElementId: string | null; draftStartPoint: TPoint | null; draftCurrentPoint: TPoint | null }) {
  if (!payload.draftStartPoint || !payload.draftCurrentPoint) return null;
  const [startX, startY] = payload.draftStartPoint;
  const [endX, endY] = payload.draftCurrentPoint;
  const dx = endX - startX;
  const dy = endY - startY;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return null;
  const now = Date.now();
  return {
    id: payload.draftElementId ?? crypto.randomUUID(),
    x: startX,
    y: startY,
    rotation: 0,
    bindings: [],
    createdAt: now,
    locked: false,
    parentGroupId: null,
    updatedAt: now,
    zIndex: "",
    data: payload.activeTool === "arrow" ? { type: "arrow", lineType: "straight", points: [[0, 0], [dx, dy]], startBinding: null, endBinding: null, startCap: "none", endCap: "arrow" } : { type: "line", lineType: "straight", points: [[0, 0], [dx, dy]], startBinding: null, endBinding: null },
    style: { strokeColor: DEFAULT_STROKE, opacity: DEFAULT_OPACITY, strokeWidth: DEFAULT_STROKE_WIDTH },
  } satisfies TElement;
}
