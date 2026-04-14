import type Konva from "konva";
import type { Node } from "konva/lib/Node";
import type { Shape, ShapeConfig } from "konva/lib/Shape";
import type { SceneService } from "../../new-services/scene/SceneService";

export type TSceneNode = Konva.Group | Shape<ShapeConfig>;

export type TArgsIsSceneNode = {
  Group: typeof Konva.Group;
  Shape: typeof Konva.Shape;
  render: SceneService;
  node: Node | null | undefined;
};

export function fxIsSceneNode(args: TArgsIsSceneNode): args is TArgsIsSceneNode & { node: TSceneNode } {
  return Boolean(args.node) && (args.node instanceof args.Group || args.node instanceof args.Shape);
}

export type TArgsIsSceneParent = {
  Group: typeof Konva.Group;
  Layer: typeof Konva.Layer;
  render: SceneService;
  node: Node | null | undefined;
};

export function fxIsSceneParent(args: TArgsIsSceneParent): args is TArgsIsSceneParent & { node: Konva.Layer | Konva.Group } {
  return Boolean(args.node) && (args.node instanceof args.Layer || args.node instanceof args.Group);
}

export type TArgsFindSceneNodeById = {
  Group: typeof Konva.Group;
  Shape: typeof Konva.Shape;
  render: SceneService;
  id: string;
};

export function fxFindSceneNodeById(args: TArgsFindSceneNodeById) {
  const node = args.render.staticForegroundLayer.findOne((candidate: Node) => {
    return fxIsSceneNode({ Group: args.Group, Shape: args.Shape, render: args.render, node: candidate }) && candidate.id() === args.id;
  });

  return fxIsSceneNode({ Group: args.Group, Shape: args.Shape, render: args.render, node }) ? node : null;
}

export type TArgsGetGroupChildren = {
  Group: typeof Konva.Group;
  Shape: typeof Konva.Shape;
  group: Konva.Group;
  render: SceneService;
};

export function fxGetGroupChildren(args: TArgsGetGroupChildren) {
  return args.group.getChildren().filter((node): node is TSceneNode => {
    return fxIsSceneNode({ Group: args.Group, Shape: args.Shape, render: args.render, node });
  });
}

export type TArgsGetSelectionGroupParent = {
  Group: typeof Konva.Group;
  Layer: typeof Konva.Layer;
  render: SceneService;
  selection: TSceneNode[];
};

export function fxGetSelectionGroupParent(args: TArgsGetSelectionGroupParent) {
  const firstParent = args.selection[0]?.getParent();
  if (!fxIsSceneParent({ Group: args.Group, Layer: args.Layer, render: args.render, node: firstParent })) {
    return null;
  }

  if (!args.selection.every((node) => node.getParent() === firstParent)) {
    return null;
  }

  return firstParent;
}
