import Konva from "konva";
import { fxGetAbsolutePositionFromWorldPosition } from "../../core/fn.world-position";
import {
  CURVE_TENSION,
  getElementData,
  type THandleDragSnapshot,
  type TPoint,
  type TShape1dData,
  type TShape1dNode,
} from "./Shape1d.shared";

function getLayerAbsoluteTransform(node: Konva.Node) {
  return node.getLayer()?.getAbsoluteTransform().copy() ?? null;
}

function absolutePointToLocal(transform: Konva.Transform, point: { x: number; y: number }) {
  return transform.copy().invert().point(point);
}

export function worldPointToLocal(node: TShape1dNode, point: { x: number; y: number }) {
  const layerTransform = getLayerAbsoluteTransform(node);
  const absolutePoint = layerTransform ? layerTransform.point(point) : point;
  return node.getAbsoluteTransform().copy().invert().point(absolutePoint);
}

export function localPointToWorld(node: TShape1dNode, point: TPoint | { x: number; y: number }) {
  const resolvedPoint = Array.isArray(point) ? { x: point[0], y: point[1] } : point;
  const absolutePoint = node.getAbsoluteTransform().point(resolvedPoint);
  const layerTransform = getLayerAbsoluteTransform(node);
  return layerTransform ? layerTransform.invert().point(absolutePoint) : absolutePoint;
}

function getCurveControlPoints(points: TPoint[], index: number) {
  const p0 = points[index - 1] ?? points[index]!;
  const p1 = points[index]!;
  const p2 = points[index + 1]!;
  const p3 = points[index + 2] ?? p2;
  const cp1: TPoint = [
    p1[0] + ((p2[0] - p0[0]) / 6) * CURVE_TENSION,
    p1[1] + ((p2[1] - p0[1]) / 6) * CURVE_TENSION,
  ];
  const cp2: TPoint = [
    p2[0] - ((p3[0] - p1[0]) / 6) * CURVE_TENSION,
    p2[1] - ((p3[1] - p1[1]) / 6) * CURVE_TENSION,
  ];
  return { p1, cp1, cp2, p2 };
}

function evaluateCubicPoint(p1: TPoint, cp1: TPoint, cp2: TPoint, p2: TPoint, t: number): TPoint {
  const mt = 1 - t;
  return [
    mt ** 3 * p1[0] + 3 * mt ** 2 * t * cp1[0] + 3 * mt * t ** 2 * cp2[0] + t ** 3 * p2[0],
    mt ** 3 * p1[1] + 3 * mt ** 2 * t * cp1[1] + 3 * mt * t ** 2 * cp2[1] + t ** 3 * p2[1],
  ];
}

export function getInsertionPoint(data: TShape1dData, segmentIndex: number): TPoint {
  const p1 = data.points[segmentIndex];
  const p2 = data.points[segmentIndex + 1];
  if (!p1 || !p2) {
    return [0, 0];
  }

  if (data.lineType === "curved" && data.points.length > 2) {
    const { p1: start, cp1, cp2, p2: end } = getCurveControlPoints(data.points, segmentIndex);
    return evaluateCubicPoint(start, cp1, cp2, end, 0.5);
  }

  return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
}

export function applyAnchorDrag(
  node: TShape1dNode,
  drag: THandleDragSnapshot,
  worldPoint: { x: number; y: number },
) {
  const data = getElementData(node);
  if (!data) {
    return;
  }

  const nextData = structuredClone(data);
  if (drag.pointIndex === 0) {
    node.absolutePosition(fxGetAbsolutePositionFromWorldPosition({
      worldPosition: worldPoint,
      parentTransform: node.getLayer()?.getAbsoluteTransform() ?? null,
    }));
    nextData.points = drag.beforePoints.map((point, index) => {
      if (index === 0) {
        return [0, 0];
      }

      const absolutePoint = drag.beforeAbsoluteTransform.point({ x: point[0], y: point[1] });
      const nextLocal = absolutePointToLocal(node.getAbsoluteTransform(), absolutePoint);
      return [nextLocal.x, nextLocal.y] as TPoint;
    });
  } else {
    const nextLocal = worldPointToLocal(node, worldPoint);
    nextData.points[drag.pointIndex] = [nextLocal.x, nextLocal.y];
  }

  node.setAttr("vcElementData", nextData);
  node.getLayer()?.batchDraw();
}
