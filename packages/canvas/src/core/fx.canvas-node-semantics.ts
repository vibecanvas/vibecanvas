import type Konva from "konva";
import type { Shape, ShapeConfig } from "konva/lib/Shape";

export type TCanvasSemanticsEditor = {
  toElement?(node: Konva.Node): unknown;
  toGroup(node: Konva.Node): unknown;
};

export type TCanvasNode = Konva.Group | Shape<ShapeConfig>;
export type TCanvasNodeKind = "group" | "element";

export type TPortalCanvasNodeSemantics = Record<string, never>;

export type TArgsGetCanvasNodeKind = {
  editor: TCanvasSemanticsEditor;
  node: Konva.Node | null | undefined;
};

export function fxGetCanvasNodeKind(
  portal: TPortalCanvasNodeSemantics,
  args: TArgsGetCanvasNodeKind,
): TCanvasNodeKind | null {
  void portal;

  if (!args.node) {
    return null;
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

export function fxIsCanvasNode(
  portal: TPortalCanvasNodeSemantics,
  args: TArgsIsCanvasNode,
): args is TArgsIsCanvasNode & { node: TCanvasNode } {
  return fxGetCanvasNodeKind(portal, args) !== null;
}

export type TArgsIsCanvasGroupNode = {
  editor: TCanvasSemanticsEditor;
  node: Konva.Node | null | undefined;
};

export function fxIsCanvasGroupNode(
  portal: TPortalCanvasNodeSemantics,
  args: TArgsIsCanvasGroupNode,
): args is TArgsIsCanvasGroupNode & { node: Konva.Group } {
  return fxGetCanvasNodeKind(portal, args) === "group";
}

export type TArgsIsCanvasElementHostNode = {
  editor: TCanvasSemanticsEditor;
  node: Konva.Node | null | undefined;
};

export function fxIsCanvasElementHostNode(
  portal: TPortalCanvasNodeSemantics,
  args: TArgsIsCanvasElementHostNode,
): args is TArgsIsCanvasElementHostNode & { node: TCanvasNode } {
  return fxGetCanvasNodeKind(portal, args) === "element";
}

export type TArgsGetCanvasParentGroupId = {
  editor: TCanvasSemanticsEditor;
  node: Konva.Node | null | undefined;
};

export function fxGetCanvasParentGroupId(
  portal: TPortalCanvasNodeSemantics,
  args: TArgsGetCanvasParentGroupId,
) {
  const parent = args.node?.getParent();
  if (!fxIsCanvasGroupNode(portal, { editor: args.editor, node: parent })) {
    return null;
  }

  const semanticParent = parent as Konva.Group;
  return semanticParent.id();
}

export type TArgsGetCanvasAncestorGroups = {
  editor: TCanvasSemanticsEditor;
  node: Konva.Node | null | undefined;
};

export function fxGetCanvasAncestorGroups(
  portal: TPortalCanvasNodeSemantics,
  args: TArgsGetCanvasAncestorGroups,
) {
  const groups: Konva.Group[] = [];
  let current = args.node?.getParent() ?? null;

  while (current) {
    if (fxIsCanvasGroupNode(portal, { editor: args.editor, node: current })) {
      groups.push(current as Konva.Group);
    }

    current = current.getParent();
  }

  return groups;
}
