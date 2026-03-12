import { getStroke, type StrokeOptions } from "perfect-freehand";
import { logCanvasDebug } from "./canvas-debug";

type TStrokePoint = {
  x: number;
  y: number;
  pressure: number;
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
    logCanvasDebug("[stroke-renderer] Skipping stroke path: not enough points", {
      pointsLength: points.length,
    });
    return "";
  }

  const outlinePoints = getStroke(
    points.map((point) => [point.x, point.y, point.pressure] as [number, number, number]),
    {
      ...DEFAULT_STROKE_OPTIONS,
      ...options,
    },
  );

  logCanvasDebug("[stroke-renderer] Generated outline points", {
    inputPoints: points.length,
    outlinePoints: outlinePoints.length,
  });

  const path = getSvgPathFromStroke(outlinePoints);

  logCanvasDebug("[stroke-renderer] Generated SVG path", {
    pathLength: path.length,
  });

  return path;
}

export type { TStrokePoint };
export { DEFAULT_STROKE_OPTIONS, getStrokePath };
