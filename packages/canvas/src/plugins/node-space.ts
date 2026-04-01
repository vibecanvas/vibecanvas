import Konva from "konva";

function getLayerTransform(node: Konva.Node) {
  const layer = node.getLayer();
  if (!layer) return null;
  return layer.getAbsoluteTransform().copy();
}

export function getWorldPosition(node: Konva.Node) {
  const layerTransform = getLayerTransform(node);
  if (!layerTransform) {
    return { x: node.x(), y: node.y() };
  }

  const absolutePosition = node.getAbsolutePosition();
  layerTransform.invert();
  return layerTransform.point(absolutePosition);
}

export function setWorldPosition(node: Konva.Node, position: { x: number; y: number }) {
  const layerTransform = getLayerTransform(node);
  if (!layerTransform) {
    node.position(position);
    return;
  }

  node.setAbsolutePosition(layerTransform.point(position));
}
