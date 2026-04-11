import { getStroke, type StrokeOptions } from "perfect-freehand";
import type { TElement, TPenData, TPoint2D } from "@vibecanvas/service-automerge/types/canvas-doc.types";

type TStrokePoint = {
  x: number;
  y: number;
  pressure: number;
};

type TSerializedPenStroke = {
  x: number;
  y: number;
  points: TPoint2D[];
  pressures: number[];
};

const DEFAULT_STROKE_OPTIONS: StrokeOptions = {
  size: 7,
  thinning: 0.6,
  smoothing: 0.5,
  streamline: 0.35,
  simulatePressure: true,
  last: true,
  start: {
    cap: true,
  },
  end: {
    cap: true,
  },
};

function average(a: number, b: number) {
  return (a + b) / 2;
}

function getSvgPathFromStroke(points: number[][]) {
  const length = points.length;

  if (length < 4) {
    return "";
  }

  let a = points[0]!;
  let b = points[1]!;
  const c = points[2]!;

  let path = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(b[1], c[1]).toFixed(2)} T`;

  for (let index = 2; index < length - 1; index += 1) {
    a = points[index]!;
    b = points[index + 1]!;
    path += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `;
  }

  path += "Z";

  return path;
}

function getStrokePath(points: TStrokePoint[], options?: StrokeOptions) {
  if (points.length < 2) {
    return "";
  }

  const outlinePoints = getStroke(
    points.map((point) => [point.x, point.y, point.pressure] as [number, number, number]),
    {
      ...DEFAULT_STROKE_OPTIONS,
      ...options,
    },
  );

  return getSvgPathFromStroke(outlinePoints);
}

function serializeStrokePoints(points: TStrokePoint[]): TSerializedPenStroke | null {
  if (points.length < 2) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
  }

  return {
    x: minX,
    y: minY,
    points: points.map((point) => [point.x - minX, point.y - minY]),
    pressures: points.map((point) => point.pressure),
  };
}

function getStrokePointsFromPenData(element: Pick<TElement, "x" | "y" | "data">): TStrokePoint[] {
  if (element.data.type !== "pen") return [];
  const data = element.data;

  return data.points.map((point, index) => ({
    x: element.x + point[0],
    y: element.y + point[1],
    pressure: data.pressures[index] ?? 0.5,
  }));
}

function getLocalStrokePointsFromPenData(element: Pick<TElement, "data">): TStrokePoint[] {
  if (element.data.type !== "pen") return [];
  const data = element.data;

  return data.points.map((point, index) => ({
    x: point[0],
    y: point[1],
    pressure: data.pressures[index] ?? 0.5,
  }));
}

function getStrokePathFromPenData(element: Pick<TElement, "data">, options?: StrokeOptions) {
  return getStrokePath(getLocalStrokePointsFromPenData(element), {
    ...options,
    simulatePressure: element.data.type === "pen" ? element.data.simulatePressure : true,
  });
}

function createPenDataFromStrokePoints(points: TStrokePoint[]): (TPenData & { x: number; y: number }) | null {
  const serialized = serializeStrokePoints(points);
  if (!serialized) return null;

  return {
    type: "pen",
    x: serialized.x,
    y: serialized.y,
    points: serialized.points,
    pressures: serialized.pressures,
    simulatePressure: true,
  };
}

function scalePenDataPoints(points: TPoint2D[], scaleX: number, scaleY: number): TPoint2D[] {
  return points.map((point) => [point[0] * scaleX, point[1] * scaleY]);
}

export type { TStrokePoint };
export {
  DEFAULT_STROKE_OPTIONS,
  createPenDataFromStrokePoints,
  getLocalStrokePointsFromPenData,
  getStrokePath,
  getStrokePathFromPenData,
  getStrokePointsFromPenData,
  scalePenDataPoints,
  serializeStrokePoints,
};
