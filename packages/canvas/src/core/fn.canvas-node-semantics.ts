import type Konva from "konva";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import { VC_NODE_KIND_ATTR } from "./CONSTANTS";
import { isKonvaGroup } from "./GUARDS";

export type TCanvasSemanticsEditor = {
  toElement?(node: Konva.Node): unknown;
  toGroup(node: Konva.Node): unknown;
};

export type TCanvasNode = Konva.Group | Shape<ShapeConfig>;
export type TCanvasNodeKind = "group" | "element";

export type TArgsGetCanvasNodeKind = {
  editor: TCanvasSemanticsEditor;
  node: Konva.Node | null | undefined;
};
// TODO: remove editor dependency
export function fnGetCanvasNodeKind(args: TArgsGetCanvasNodeKind): TCanvasNodeKind | null {
  if (!args.node) {
    return null;
  }
  const kind = args.node.getAttr(VC_NODE_KIND_ATTR);
  if (!kind) {
    return null;
  }
  if (kind) {
    return kind as TCanvasNodeKind;
  }

  if (args.editor.toGroup(args.node)) {
    return "group";
  }

  if (args.editor.toElement?.(args.node)) {
    return "element";
  }

  return null;
}

export type TArgsIsCanvasNode = {
  editor: TCanvasSemanticsEditor;
  node: Konva.Node | null | undefined;
};

export function fnIsCanvasNode(
  args: TArgsIsCanvasNode,
): args is TArgsIsCanvasNode & { node: TCanvasNode } {
  return fnGetCanvasNodeKind(args) !== null;
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
