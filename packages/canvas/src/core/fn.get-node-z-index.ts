import type Konva from "konva";

const VC_Z_INDEX_ATTR = "vcZIndex";

export function fxGetNodeZIndex(node: Konva.Group | Konva.Shape) {
  const value = node.getAttr(VC_Z_INDEX_ATTR);
  return typeof value === "string" ? value : "";
}
