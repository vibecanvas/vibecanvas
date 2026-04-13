import type Konva from "konva";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import type { EditorService } from "../new-services/editor/EditorService";

export type TCanvasNode = Konva.Group | Shape<ShapeConfig>;
export type TCanvasNodeKind = "group" | "element";

export type TArgsGetCanvasNodeKind = {
  editor: EditorService;
  node: Konva.Node | null | undefined;
};

export function fxGetCanvasNodeKind(args: TArgsGetCanvasNodeKind): TCanvasNodeKind | null {
  if (!args.node) {
    return null;
  }

  if (args.editor.toGroup(args.node)) {
    return "group";
  }

  if (args.editor.toElement(args.node)) {
    return "element";
  }

  return null;
}

export type TArgsIsCanvasNode = {
  editor: EditorService;
  node: Konva.Node | null | undefined;
};

export function fxIsCanvasNode(args: TArgsIsCanvasNode): args is TArgsIsCanvasNode & { node: TCanvasNode } {
  return fxGetCanvasNodeKind(args) !== null;
}

export type TArgsIsCanvasGroupNode = {
  editor: EditorService;
  node: Konva.Node | null | undefined;
};

export function fxIsCanvasGroupNode(args: TArgsIsCanvasGroupNode): args is TArgsIsCanvasGroupNode & { node: Konva.Group } {
  return fxGetCanvasNodeKind(args) === "group";
}

export type TArgsIsCanvasElementHostNode = {
  editor: EditorService;
  node: Konva.Node | null | undefined;
};

export function fxIsCanvasElementHostNode(args: TArgsIsCanvasElementHostNode): args is TArgsIsCanvasElementHostNode & { node: TCanvasNode } {
  return fxGetCanvasNodeKind(args) === "element";
}

export type TArgsGetCanvasParentGroupId = {
  editor: EditorService;
  node: Konva.Node | null | undefined;
};

export function fxGetCanvasParentGroupId(args: TArgsGetCanvasParentGroupId) {
  const parent = args.node?.getParent();
  if (!fxIsCanvasGroupNode({ editor: args.editor, node: parent })) {
    return null;
  }

  const semanticParent = parent as Konva.Group;
  return semanticParent.id();
}

export type TArgsGetCanvasAncestorGroups = {
  editor: EditorService;
  node: Konva.Node | null | undefined;
};

export function fxGetCanvasAncestorGroups(args: TArgsGetCanvasAncestorGroups) {
  const groups: Konva.Group[] = [];
  let current = args.node?.getParent() ?? null;

  while (current) {
    if (fxIsCanvasGroupNode({ editor: args.editor, node: current })) {
      groups.push(current as Konva.Group);
    }

    current = current.getParent();
  }

  return groups;
}
