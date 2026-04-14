import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import { fxHostedComponentSnapshotToElement } from "./fn.hosted-component-snapshot-to-element";
import { fxGetCanvasParentGroupId } from "../../../core/fn.canvas-node-semantics";
import type { SceneService } from "../../../new-services/scene/SceneService";

export type TPortalToHostedComponentElement = {
  editor: { toGroup(node: Konva.Node): unknown };
  render: SceneService;
};

export type TArgsToHostedComponentElement = {
  node: Konva.Node;
  kind: string;
  groupKindAttr: string;
  createdAtAttr: string;
  widthAttr: string;
  heightAttr: string;
  backgroundAttr: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultBackgroundColor: string;
  now: () => number;
};

function findHostedComponentGroup(render: SceneService, node: Konva.Node, groupKindAttr: string, kind: string) {
  if (node instanceof render.Group && node.getAttr(groupKindAttr) === kind) {
    return node;
  }

  const parent = node.getParent();
  if (parent instanceof render.Group && parent.getAttr(groupKindAttr) === kind) {
    return parent;
  }

  return null;
}

export function fxToHostedComponentElement(portal: TPortalToHostedComponentElement, args: TArgsToHostedComponentElement) {
  const group = findHostedComponentGroup(portal.render, args.node, args.groupKindAttr, args.kind);
  if (!(group instanceof portal.render.Group)) {
    return null;
  }

  const updatedAt = args.now();
  const width = Number(group.getAttr(args.widthAttr) ?? args.defaultWidth) * group.scaleX();
  const height = Number(group.getAttr(args.heightAttr) ?? args.defaultHeight) * group.scaleY();
  const backgroundColor = String(group.getAttr(args.backgroundAttr) ?? args.defaultBackgroundColor);
  const parentGroupId = fxGetCanvasParentGroupId({ editor: portal.editor, node: group });

  return fxHostedComponentSnapshotToElement({
    id: group.id(),
    x: group.x(),
    y: group.y(),
    rotation: group.rotation(),
    createdAt: Number(group.getAttr(args.createdAtAttr) ?? updatedAt),
    updatedAt,
    parentGroupId,
    zIndex: String(group.getAttr("vcZIndex") ?? ""),
    opacity: group.opacity(),
    width,
    height,
    kind: args.kind,
    backgroundColor,
  }) satisfies TElement;
}
