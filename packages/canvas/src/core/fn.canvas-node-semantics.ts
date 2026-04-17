import type Konva from "konva";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import { VC_NODE_KIND_ATTR } from "./CONSTANTS";
import { isKonvaGroup } from "./GUARDS";

export type TCanvasSemanticsEditor = {
  toElement?(node: Konva.Node): unknown;
  toGroup(node: Konva.Node): unknown;s
};

export type TCanvasNode = Konva.Group | Shape<ShapeConfig>;
export type TCanvasNodeKind = "group" | "element";

export function fnGetCanvasNodeKind(node: Konva.Node): TCanvasNodeKind | null {
  if (!node) {
    return null;
  }
  const kind = node.getAttr(VC_NODE_KIND_ATTR);
  if (!kind) {
    return null;
  }
  return kind as TCanvasNodeKind;
}

export function fnIsCanvasNode(
  node: Konva.Node,
): node is TCanvasNode {
  return fnGetCanvasNodeKind(node) !== null;
}

export type TArgsIsCanvasGroupNode = {
  editor: TCanvasSemanticsEditor;
  node: Konva.Node | null | undefined;
};

export function fnIsCanvasGroupNode(
  args: TArgsIsCanvasGroupNode,
): args is TArgsIsCanvasGroupNode & { node: Konva.Group } {
  return fnGetCanvasNodeKind(args) === "group";
}

export type TArgsIsCanvasElementHostNode = {
  editor: TCanvasSemanticsEditor;
  node: Konva.Node | null | undefined;
};

export function fnIsCanvasElementHostNode(
  args: TArgsIsCanvasElementHostNode,
): args is TArgsIsCanvasElementHostNode & { node: TCanvasNode } {
  return fnGetCanvasNodeKind(args) === "element";
}

export type TArgsGetCanvasParentGroupId = {
  editor: TCanvasSemanticsEditor;
  node: Konva.Node | null | undefined;
};

export function fnGetCanvasParentGroupId(args: TArgsGetCanvasParentGroupId) {
  const parent = args.node?.getParent();
  if (!parent)  return null;
  if (!fnIsCanvasGroupNode({ editor: args.editor, node: parent })) return null;

  return parent.id();
}

export type TArgsGetCanvasAncestorGroups = {
  editor: TCanvasSemanticsEditor;
  node: Konva.Node | null | undefined;
};

export function fnGetCanvasAncestorGroups(args: TArgsGetCanvasAncestorGroups) {
  const groups: Konva.Group[] = [];
  let current = args.node?.getParent() ?? null;

  while (current) {
    if (isKonvaGroup(current) && fnIsCanvasGroupNode({ editor: args.editor, node: current })) {
      groups.push(current);
    }

    current = current.getParent();
  }

  return groups;
}
