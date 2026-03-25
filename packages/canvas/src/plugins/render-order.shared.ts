import Konva from "konva";

const VC_Z_INDEX_ATTR = "vcZIndex";

function getNodeZIndex(node: Konva.Group | Konva.Shape): string {
  const value = node.getAttr(VC_Z_INDEX_ATTR);
  return typeof value === "string" ? value : "";
}

function setNodeZIndex(node: Konva.Group | Konva.Shape, zIndex: string) {
  node.setAttr(VC_Z_INDEX_ATTR, zIndex);
}

function createOrderedZIndex(index: number) {
  return `z${String(index).padStart(8, "0")}`;
}

export { VC_Z_INDEX_ATTR, getNodeZIndex, setNodeZIndex, createOrderedZIndex };
