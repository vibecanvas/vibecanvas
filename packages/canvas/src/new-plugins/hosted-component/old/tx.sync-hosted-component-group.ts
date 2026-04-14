import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { SceneService } from "../../../new-services/scene/SceneService";

export type TPortalSyncHostedComponentGroup = {
  render: SceneService;
};

export type TArgsSyncHostedComponentGroup = {
  group: Konva.Group;
  element: TElement;
  groupKindAttr: string;
  createdAtAttr: string;
  widthAttr: string;
  heightAttr: string;
  backgroundAttr: string;
  kind: string;
  hitName: string;
  windowName: string;
  headerName: string;
  bodyName: string;
  titleName: string;
  controlCloseName: string;
  controlMinimizeName: string;
  controlFullscreenName: string;
  windowRadiusPx: number;
  headerHeightPx: number;
  controlRadiusPx: number;
  controlGapPx: number;
  controlStartXPx: number;
  controlYPx: number;
  headerTitle: string;
  windowBackground: string;
  windowStroke: string;
  titleColor: string;
  defaultBackgroundColor: string;
};

function findChild<TNode extends Konva.Node>(group: Konva.Group, predicate: (node: Konva.Node) => boolean) {
  return group.getChildren().find(predicate) as TNode | undefined;
}

type THostedComponentRenderableElement = TElement & {
  data: TElement["data"] & {
    type: "custom";
    w: number;
    h: number;
    payload: {
      kind?: unknown;
      backgroundColor?: unknown;
    };
  };
};

function isHostedComponentElement(element: TElement, kind: string): element is THostedComponentRenderableElement {
  return element.data.type === "custom"
    && typeof element.data.payload === "object"
    && element.data.payload !== null
    && (element.data.payload as { kind?: unknown }).kind === kind;
}

function getHostedBackgroundColor(element: THostedComponentRenderableElement, defaultBackgroundColor: string) {
  return typeof element.data.payload.backgroundColor === "string"
    ? element.data.payload.backgroundColor
    : (element.style.backgroundColor ?? defaultBackgroundColor);
}

export function txSyncHostedComponentGroup(portal: TPortalSyncHostedComponentGroup, args: TArgsSyncHostedComponentGroup) {
  if (!isHostedComponentElement(args.element, args.kind)) {
    return false;
  }

  const width = args.element.data.w;
  const height = args.element.data.h;
  const bodyColor = getHostedBackgroundColor(args.element, args.defaultBackgroundColor);

  args.group.position({ x: args.element.x, y: args.element.y });
  args.group.rotation(args.element.rotation);
  args.group.scale({ x: 1, y: 1 });
  args.group.skew({ x: 0, y: 0 });
  args.group.opacity(args.element.style.opacity ?? 1);
  args.group.draggable(true);
  args.group.listening(true);
  args.group.setAttr(args.groupKindAttr, args.kind);
  args.group.setAttr(args.createdAtAttr, args.element.createdAt);
  args.group.setAttr(args.widthAttr, width);
  args.group.setAttr(args.heightAttr, height);
  args.group.setAttr(args.backgroundAttr, bodyColor);

  const hit = findChild<Konva.Rect>(args.group, (node) => node instanceof portal.render.Rect && node.name() === args.hitName);
  hit?.position({ x: 0, y: 0 });
  hit?.size({ width, height });

  const windowRect = findChild<Konva.Rect>(args.group, (node) => node instanceof portal.render.Rect && node.name() === args.windowName);
  windowRect?.position({ x: 0, y: 0 });
  windowRect?.size({ width, height });
  windowRect?.cornerRadius(args.windowRadiusPx);
  windowRect?.fill(args.windowBackground);
  windowRect?.stroke(args.windowStroke);
  windowRect?.strokeWidth(1);

  const headerRect = findChild<Konva.Rect>(args.group, (node) => node instanceof portal.render.Rect && node.name() === args.headerName);
  headerRect?.position({ x: 0, y: 0 });
  headerRect?.size({ width, height: args.headerHeightPx });
  headerRect?.cornerRadius([args.windowRadiusPx, args.windowRadiusPx, 0, 0]);
  headerRect?.fill(args.windowBackground);

  const bodyRect = findChild<Konva.Rect>(args.group, (node) => node instanceof portal.render.Rect && node.name() === args.bodyName);
  bodyRect?.position({ x: 0, y: args.headerHeightPx });
  bodyRect?.size({ width, height: Math.max(0, height - args.headerHeightPx) });
  bodyRect?.cornerRadius([0, 0, args.windowRadiusPx, args.windowRadiusPx]);
  bodyRect?.fill(bodyColor);

  const title = findChild<Konva.Text>(args.group, (node) => node instanceof portal.render.Text && node.name() === args.titleName);
  title?.position({ x: 0, y: 0 });
  title?.width(width);
  title?.height(args.headerHeightPx);
  title?.text(args.headerTitle);
  title?.fill(args.titleColor);

  const closeControl = findChild<Konva.Circle>(args.group, (node) => node instanceof portal.render.Circle && node.name() === args.controlCloseName);
  closeControl?.position({ x: args.controlStartXPx, y: args.controlYPx });

  const minimizeControl = findChild<Konva.Circle>(args.group, (node) => node instanceof portal.render.Circle && node.name() === args.controlMinimizeName);
  minimizeControl?.position({ x: args.controlStartXPx + args.controlRadiusPx * 2 + args.controlGapPx, y: args.controlYPx });

  const fullscreenControl = findChild<Konva.Circle>(args.group, (node) => node instanceof portal.render.Circle && node.name() === args.controlFullscreenName);
  fullscreenControl?.position({ x: args.controlStartXPx + (args.controlRadiusPx * 2 + args.controlGapPx) * 2, y: args.controlYPx });

  return true;
}
