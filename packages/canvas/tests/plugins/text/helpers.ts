import Konva from "konva";
import { GroupPlugin } from "../../../src/plugins/Group.plugin";
import { SelectPlugin } from "../../../src/plugins/Select.plugin";
import { Shape2dPlugin } from "../../../src/plugins/Shape2d.plugin";
import { TextPlugin } from "../../../src/plugins/Text.plugin";
import { TransformPlugin } from "../../../src/plugins/Transform.plugin";
import { EventListenerPlugin } from "../../../src/plugins/EventListener.plugin";
import { CameraControlPlugin } from "../../../src/plugins/CameraControl.plugin";
import { HistoryControlPlugin } from "../../../src/plugins/HistoryControl.plugin";
import { HelpPlugin } from "../../../src/plugins/Help.plugin";
import { ToolbarPlugin } from "../../../src/plugins/Toolbar.plugin";
import { GridPlugin } from "../../../src/plugins/Grid.plugin";

export function createFullPluginStack() {
  const groupPlugin = new GroupPlugin();
  return {
    groupPlugin,
    plugins: [
      new EventListenerPlugin(),
      new GridPlugin(),
      new CameraControlPlugin(),
      new HistoryControlPlugin(),
      new ToolbarPlugin(() => {}),
      new HelpPlugin(),
      new SelectPlugin(),
      new TransformPlugin(),
      new Shape2dPlugin(),
      new TextPlugin(),
      groupPlugin,
    ],
  };
}

export function dragShape(shape: Konva.Shape, args: { deltaX: number; deltaY?: number }) {
  const beforePos = shape.absolutePosition();
  shape.fire("dragstart", {
    target: shape,
    currentTarget: shape,
    evt: new MouseEvent("dragstart", { bubbles: true }),
  });
  shape.setAbsolutePosition({ x: beforePos.x + args.deltaX, y: beforePos.y + (args.deltaY ?? 0) });
  shape.fire("dragmove", {
    target: shape,
    currentTarget: shape,
    evt: new MouseEvent("dragmove", { bubbles: true }),
  });
  shape.fire("dragend", {
    target: shape,
    currentTarget: shape,
    evt: new MouseEvent("dragend", { bubbles: true }),
  });
}

export function altDragNode(node: Konva.Node, args: { deltaX: number; deltaY?: number }) {
  const beforeNodeIds = new Set(
    node.getStage()?.getLayers().flatMap((layer) => layer.getChildren()).map((child) => child._id) ?? [],
  );

  node.fire("dragstart", {
    target: node,
    currentTarget: node,
    evt: new MouseEvent("dragstart", { bubbles: true, altKey: true }),
  });

  const previewClone = node.getStage()?.getLayers()
    .flatMap((layer) => layer.getChildren())
    .find((child) => !beforeNodeIds.has(child._id) && child.constructor === node.constructor);

  if (!previewClone) {
    throw new Error("Expected preview clone after alt-drag start");
  }

  const beforePos = previewClone.absolutePosition();
  previewClone.setAbsolutePosition({
    x: beforePos.x + args.deltaX,
    y: beforePos.y + (args.deltaY ?? 0),
  });
  previewClone.fire("dragend", {
    target: previewClone,
    currentTarget: previewClone,
    evt: new MouseEvent("dragend", { bubbles: true, altKey: true }),
  });
}

export function simulateTransformerResize(
  transformer: Konva.Transformer,
  node: Konva.Text,
  args: { scaleX: number; scaleY: number }
) {
  transformer.fire("transformstart", { target: node, currentTarget: transformer, evt: {} as Event });

  const prevScaleX = node.scaleX();
  const prevScaleY = node.scaleY();
  node.scaleX(prevScaleX * args.scaleX);
  node.scaleY(prevScaleY * args.scaleY);
  node.fire("transform", { target: node, currentTarget: node, evt: {} as Event });

  transformer.fire("transformend", { target: node, currentTarget: transformer, evt: {} as Event });
}
