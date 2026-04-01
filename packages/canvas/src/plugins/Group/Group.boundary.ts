import Konva from "konva";
import type { IPluginContext } from "../shared/interface";
import type { GroupBoundary } from "./Group.shared";

function createBoundaryRect(context: IPluginContext, group: Konva.Group): GroupBoundary {
  const boundary = new Konva.Rect({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    stroke: "#1e1e1e",
    dash: [11, 11],
    strokeWidth: 2,
    strokeScaleEnabled: false,
    draggable: false,
    listening: false,
    visible: false,
    name: "group-boundary:" + group.id(),
  });

  const getBoundaryBox = () => {
    const groupRect = group.getClientRect({ relativeTo: group });

    return {
      x: groupRect.x,
      y: groupRect.y,
      width: groupRect.width,
      height: groupRect.height,
    };
  };

  const update = () => {
    const box = getBoundaryBox();
    const groupTransform = group.getAbsoluteTransform();
    const dynamicLayerInverseTransform = context.dynamicLayer.getAbsoluteTransform().copy();
    dynamicLayerInverseTransform.invert();

    const topLeft = dynamicLayerInverseTransform.point(groupTransform.point({ x: box.x, y: box.y }));
    const topRight = dynamicLayerInverseTransform.point(groupTransform.point({ x: box.x + box.width, y: box.y }));
    const bottomLeft = dynamicLayerInverseTransform.point(groupTransform.point({ x: box.x, y: box.y + box.height }));

    const width = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
    const height = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y);
    const rotation = Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x) * 180 / Math.PI;

    boundary.position(topLeft);
    boundary.rotation(rotation);
    boundary.scale({ x: 1, y: 1 });
    boundary.size({ width, height });
  };

  const show = () => {
    update();
    boundary.visible(true);
  };

  const hide = () => {
    boundary.visible(false);
  };

  return { node: boundary, update, show, hide, getBoundaryBox };
}

export { createBoundaryRect };
