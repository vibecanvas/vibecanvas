import type Konva from "konva";
import type { Node } from "konva/lib/Node";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import { isKonvaGroup, isKonvaLayer, isKonvaShape } from "../../core/GUARDS";
import type { SceneService } from "../../services/scene/SceneService";

export type TSceneNode = Konva.Group | Shape<ShapeConfig>;

export type TArgsIsSceneNode = {
  render: SceneService;
  node: Node | null | undefined;
};

export function fnIsSceneNode(args: TArgsIsSceneNode): args is TArgsIsSceneNode & { node: TSceneNode } {
  return Boolean(args.node) && isKonvaGroup(args.node) && isKonvaShape(args.node);
}

export type TArgsIsSceneParent = {
  render: SceneService;
  node: Node | null | undefined;
};

export function fnIsSceneParent(args: TArgsIsSceneParent): args is TArgsIsSceneParent & { node: Konva.Layer | Konva.Group } {
  return Boolean(args.node) && isKonvaLayer(args.node) && isKonvaGroup(args.node);
}

export type TArgsFindSceneNodeById = {
  render: SceneService;
  id: string;
};

export function fnFindSceneNodeById(args: TArgsFindSceneNodeById) {
  const node = args.render.staticForegroundLayer.findOne((candidate: Node) => {
    return fnIsSceneNode({ render: args.render, node: candidate }) && candidate.id() === args.id;
  });

  return fnIsSceneNode({ render: args.render, node }) ? node : null;
}

export type TArgsGetGroupChildren = {
  group: Konva.Group;
  render: SceneService;
};

export function fnGetGroupChildren(args: TArgsGetGroupChildren) {
  return args.group.getChildren().filter((node): node is TSceneNode => {
    return fnIsSceneNode({ render: args.render, node });
  });
}

export type TArgsGetSelectionGroupParent = {
  render: SceneService;
  selection: TSceneNode[];
};

export function fnGetSelectionGroupParent(args: TArgsGetSelectionGroupParent) {
  const firstParent = args.selection[0]?.getParent();
  if (!fnIsSceneParent({ render: args.render, node: firstParent })) {
    return null;
  }

  if (!args.selection.every((node) => node.getParent() === firstParent)) {
    return null;
  }

  return firstParent;
}
