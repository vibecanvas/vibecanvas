import Konva from "konva";
import type { IPluginContext } from "./interface";
import { GroupPlugin } from "../Group/Group.plugin";
import { ImagePlugin } from "../Image/Image.plugin";
import { PenPlugin } from "../Pen/Pen.plugin";
import { Shape1dPlugin } from "../Shape1d/Shape1d.plugin";
import { Shape2dPlugin } from "../Shape2d/Shape2d.plugin";
import { TextPlugin } from "../Text/Text.plugin";
import { TransformPlugin } from "../Transform/Transform.plugin";

type TCloneRoot = Konva.Group | Konva.Shape;
type TPreviewClone = Konva.Group | Konva.Shape;

function isCloneRoot(node: Konva.Node): node is TCloneRoot {
  return node instanceof Konva.Group || node instanceof Konva.Shape;
}

function isDescendantOf(node: Konva.Node, ancestor: Konva.Node) {
  let parent = node.getParent();
  while (parent) {
    if (parent === ancestor) return true;
    parent = parent.getParent();
  }

  return false;
}

function collapseCloneRoots(nodes: TCloneRoot[]) {
  return nodes.filter((node, index) => {
    return !nodes.some((candidate, candidateIndex) => {
      if (candidateIndex === index) return false;
      return isDescendantOf(node, candidate);
    });
  });
}

function getCloneTargets(context: IPluginContext, touchedNode: TCloneRoot) {
  const filteredSelection = TransformPlugin.filterSelection(context.state.selection);
  const cloneRoots = collapseCloneRoots(filteredSelection.filter(isCloneRoot));
  if (cloneRoots.length > 1 && cloneRoots.includes(touchedNode)) {
    return [
      touchedNode,
      ...cloneRoots.filter((node) => node !== touchedNode),
    ];
  }

  return [touchedNode];
}

function createPreviewClone(node: TCloneRoot) {
  if (node instanceof Konva.Group) return GroupPlugin.createPreviewClone(node);
  if (node instanceof Konva.Text) return TextPlugin.createPreviewClone(node);
  if (Shape1dPlugin.isShape1dNode(node)) return Shape1dPlugin.createPreviewClone(node);
  if (node instanceof Konva.Path) return PenPlugin.createPreviewClone(node);
  if (node instanceof Konva.Image) return ImagePlugin.createPreviewClone(node);
  return Shape2dPlugin.createPreviewClone(node);
}

function finalizePreviewClone(context: IPluginContext, sourceNode: TCloneRoot, previewNode: TPreviewClone) {
  if (sourceNode instanceof Konva.Group && previewNode instanceof Konva.Group) {
    return GroupPlugin.finalizePreviewClone(context, previewNode);
  }

  if (sourceNode instanceof Konva.Text && previewNode instanceof Konva.Text) {
    return TextPlugin.finalizePreviewClone(context, previewNode);
  }

  if (Shape1dPlugin.isShape1dNode(sourceNode) && Shape1dPlugin.isShape1dNode(previewNode)) {
    return Shape1dPlugin.finalizePreviewClone(context, previewNode);
  }

  if (sourceNode instanceof Konva.Path && previewNode instanceof Konva.Path) {
    return PenPlugin.finalizePreviewClone(context, previewNode);
  }

  if (sourceNode instanceof Konva.Image && previewNode instanceof Konva.Image) {
    return ImagePlugin.finalizePreviewClone(context, previewNode);
  }

  if (previewNode instanceof Konva.Shape) {
    return Shape2dPlugin.finalizePreviewClone(context, sourceNode as Konva.Shape, previewNode);
  }

  return null;
}

export function startSelectionCloneDrag(context: IPluginContext, touchedNode: TCloneRoot) {
  const sources = getCloneTargets(context, touchedNode);
  if (sources.length <= 1) return false;

  const entries = sources
    .map((sourceNode) => {
      const previewNode = createPreviewClone(sourceNode);
      if (!previewNode) return null;

      context.dynamicLayer.add(previewNode);
      return { sourceNode, previewNode };
    })
    .filter(Boolean) as Array<{ sourceNode: TCloneRoot; previewNode: TPreviewClone }>;

  const leader = entries.find((entry) => entry.sourceNode === touchedNode);
  if (!leader) {
    entries.forEach((entry) => entry.previewNode.destroy());
    return false;
  }

  const startPositions = new Map(entries.map((entry) => [entry.previewNode.id(), { ...entry.previewNode.absolutePosition() }]));
  const finalize = () => {
    leader.previewNode.off("dragmove", handleDragMove);
    leader.previewNode.off("dragend", finalize);

    const createdNodes = entries
      .map((entry) => finalizePreviewClone(context, entry.sourceNode, entry.previewNode))
      .filter(Boolean) as TCloneRoot[];

    context.setState("selection", createdNodes);
  };

  const handleDragMove = () => {
    const leaderStart = startPositions.get(leader.previewNode.id());
    if (!leaderStart) return;

    const current = leader.previewNode.absolutePosition();
    const dx = current.x - leaderStart.x;
    const dy = current.y - leaderStart.y;

    entries.forEach((entry) => {
      if (entry === leader) return;

      const start = startPositions.get(entry.previewNode.id());
      if (!start) return;
      entry.previewNode.absolutePosition({ x: start.x + dx, y: start.y + dy });
    });
  };

  leader.previewNode.on("dragmove", handleDragMove);
  leader.previewNode.on("dragend", finalize);
  leader.previewNode.startDrag();

  return true;
}
