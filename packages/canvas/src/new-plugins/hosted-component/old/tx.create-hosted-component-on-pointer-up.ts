import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import { fxCreateHostedComponentElement } from "./fn.create-hosted-component-element";
import type { CrdtService } from "../../../new-services/crdt/CrdtService";
import type { EditorService } from "../../../new-services/editor/EditorService";
import type { RenderOrderService } from "../../../new-services/render-order/RenderOrderService";
import type { RenderService } from "../../../new-services/render/RenderService";
import type { SelectionService } from "../../../new-services/selection/SelectionService";

export type TPortalCreateHostedComponentOnPointerUp = {
  crdt: CrdtService;
  editor: EditorService;
  render: RenderService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  createId: () => string;
  now: () => number;
};

export type TArgsCreateHostedComponentOnPointerUp = {
  pointer: {
    x: number;
    y: number;
  };
  kind: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultBackgroundColor: string;
  createNode: (element: TElement) => Konva.Node | null;
  toElement: (node: Konva.Node) => TElement | null;
};

export function txCreateHostedComponentOnPointerUp(portal: TPortalCreateHostedComponentOnPointerUp, args: TArgsCreateHostedComponentOnPointerUp) {
  const timestamp = portal.now();
  const element = fxCreateHostedComponentElement({
    id: portal.createId(),
    x: args.pointer.x - args.defaultWidth / 2,
    y: args.pointer.y - args.defaultHeight / 2,
    createdAt: timestamp,
    updatedAt: timestamp,
    kind: args.kind,
    width: args.defaultWidth,
    height: args.defaultHeight,
    backgroundColor: args.defaultBackgroundColor,
  });
  const node = args.createNode(element);
  if (!(node instanceof portal.render.Group)) {
    return false;
  }

  portal.render.staticForegroundLayer.add(node);
  portal.renderOrder.assignOrderOnInsert({
    parent: portal.render.staticForegroundLayer,
    nodes: [node],
    position: "front",
  });

  const createdElement = args.toElement(node);
  if (!createdElement) {
    node.destroy();
    portal.render.staticForegroundLayer.batchDraw();
    portal.editor.setActiveTool("select");
    return false;
  }

  portal.crdt.patch({ elements: [createdElement], groups: [] });
  portal.selection.setSelection([node]);
  portal.selection.setFocusedNode(node);
  portal.editor.setActiveTool("select");
  portal.render.staticForegroundLayer.batchDraw();
  return true;
}
