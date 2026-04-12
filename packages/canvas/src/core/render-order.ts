import Konva from "konva";

export const VC_Z_INDEX_ATTR = "vcZIndex";

export function getNodeZIndex(node: Konva.Group | Konva.Shape): string {
  const value = node.getAttr(VC_Z_INDEX_ATTR);
  return typeof value === "string" ? value : "";
}

export function setNodeZIndex(node: Konva.Group | Konva.Shape, zIndex: string) {
  node.setAttr(VC_Z_INDEX_ATTR, zIndex);
}

export function createOrderedZIndex(index: number) {
  return `z${String(index).padStart(8, "0")}`;
}
