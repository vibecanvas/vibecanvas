import type { TCustomData, TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService, TEditorToolIcon } from "../../new-services/editor/EditorService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { IHooks } from "../../runtime";

const TOOL_ID = "hosted-component";
const GROUP_KIND_ATTR = "vcHostedComponentKind";
const CREATED_AT_ATTR = "vcHostedComponentCreatedAt";
const WIDTH_ATTR = "vcHostedComponentWidth";
const HEIGHT_ATTR = "vcHostedComponentHeight";
const BACKGROUND_ATTR = "vcHostedComponentBackground";
const OVERLAY_INSET_PX = 5;
const WINDOW_RADIUS_PX = 10;
const HEADER_HEIGHT_PX = 28;
const CONTROL_RADIUS_PX = 4;
const CONTROL_GAP_PX = 6;
const CONTROL_START_X_PX = 14;
const CONTROL_Y_PX = 14;
const HEADER_TITLE = "Hosted Component";
const HIT_NAME = "hosted-component-hit";
const WINDOW_NAME = "hosted-component-window";
const HEADER_NAME = "hosted-component-header";
const BODY_NAME = "hosted-component-body";
const TITLE_NAME = "hosted-component-title";
const CONTROL_CLOSE_NAME = "hosted-component-control-close";
const CONTROL_MINIMIZE_NAME = "hosted-component-control-minimize";
const CONTROL_FULLSCREEN_NAME = "hosted-component-control-fullscreen";

type THostedComponentPayload = {
  kind: typeof TOOL_ID;
  backgroundColor: string;
};

type THostedComponentElement = Omit<TElement, "data"> & {
  data: TCustomData & {
    payload: THostedComponentPayload;
  };
};

export type TPortalSetupHostedComponent = {
  crdt: CrdtService;
  editor: EditorService;
  hooks: IHooks;
  icon: TEditorToolIcon;
  now: () => number;
  createId: () => string;
  render: RenderService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
};

export type TArgsSetupHostedComponent = {};

function createHostedComponentElement(args: {
  id: string;
  x: number;
  y: number;
  createdAt: number;
  updatedAt: number;
}): TElement {
  const data: TCustomData = {
    type: "custom",
    w: 160,
    h: 120,
    expanded: true,
    payload: {
      kind: TOOL_ID,
      backgroundColor: "#6b7280",
    },
  };

  return {
    id: args.id,
    x: args.x,
    y: args.y,
    rotation: 0,
    bindings: [],
    createdAt: args.createdAt,
    updatedAt: args.updatedAt,
    locked: false,
    parentGroupId: null,
    zIndex: "",
    style: {
      backgroundColor: "#6b7280",
      opacity: 1,
      strokeWidth: 0,
    },
    data,
  };
}

function isHostedComponentElement(element: TElement): element is THostedComponentElement {
  return element.data.type === "custom"
    && typeof element.data.payload === "object"
    && element.data.payload !== null
    && (element.data.payload as { kind?: unknown }).kind === TOOL_ID;
}

function getHostedBackgroundColor(element: THostedComponentElement) {
  return typeof element.data.payload.backgroundColor === "string"
    ? element.data.payload.backgroundColor
    : (element.style.backgroundColor ?? "#6b7280");
}

function findHostedComponentGroup(render: RenderService, node: Konva.Node) {
  if (node instanceof render.Group && node.getAttr(GROUP_KIND_ATTR) === TOOL_ID) {
    return node;
  }

  const parent = node.getParent();
  if (parent instanceof render.Group && parent.getAttr(GROUP_KIND_ATTR) === TOOL_ID) {
    return parent;
  }

  return null;
}

function findChild<TNode extends Konva.Node>(group: Konva.Group, predicate: (node: Konva.Node) => boolean) {
  return group.getChildren().find(predicate) as TNode | undefined;
}

function syncHostedComponentGroup(render: RenderService, group: Konva.Group, element: THostedComponentElement) {
  const width = element.data.w;
  const height = element.data.h;
  const bodyColor = getHostedBackgroundColor(element);

  group.position({ x: element.x, y: element.y });
  group.rotation(element.rotation);
  group.scale({ x: 1, y: 1 });
  group.skew({ x: 0, y: 0 });
  group.opacity(element.style.opacity ?? 1);
  group.draggable(true);
  group.listening(true);
  group.setAttr(GROUP_KIND_ATTR, TOOL_ID);
  group.setAttr(CREATED_AT_ATTR, element.createdAt);
  group.setAttr(WIDTH_ATTR, width);
  group.setAttr(HEIGHT_ATTR, height);
  group.setAttr(BACKGROUND_ATTR, bodyColor);

  const hit = findChild<Konva.Rect>(group, (node) => node instanceof render.Rect && node.name() === HIT_NAME);
  hit?.position({ x: 0, y: 0 });
  hit?.size({ width, height });

  const windowRect = findChild<Konva.Rect>(group, (node) => node instanceof render.Rect && node.name() === WINDOW_NAME);
  windowRect?.position({ x: 0, y: 0 });
  windowRect?.size({ width, height });
  windowRect?.cornerRadius(WINDOW_RADIUS_PX);
  windowRect?.fill("#f8fafc");
  windowRect?.stroke("rgba(15, 23, 42, 0.18)");
  windowRect?.strokeWidth(1);

  const headerRect = findChild<Konva.Rect>(group, (node) => node instanceof render.Rect && node.name() === HEADER_NAME);
  headerRect?.position({ x: 0, y: 0 });
  headerRect?.size({ width, height: HEADER_HEIGHT_PX });
  headerRect?.cornerRadius([WINDOW_RADIUS_PX, WINDOW_RADIUS_PX, 0, 0]);
  headerRect?.fill("#f8fafc");

  const bodyRect = findChild<Konva.Rect>(group, (node) => node instanceof render.Rect && node.name() === BODY_NAME);
  bodyRect?.position({ x: 0, y: HEADER_HEIGHT_PX });
  bodyRect?.size({ width, height: Math.max(0, height - HEADER_HEIGHT_PX) });
  bodyRect?.cornerRadius([0, 0, WINDOW_RADIUS_PX, WINDOW_RADIUS_PX]);
  bodyRect?.fill(bodyColor);

  const title = findChild<Konva.Text>(group, (node) => node instanceof render.Text && node.name() === TITLE_NAME);
  title?.position({ x: 0, y: 0 });
  title?.width(width);
  title?.height(HEADER_HEIGHT_PX);
  title?.text(HEADER_TITLE);

  const closeControl = findChild<Konva.Circle>(group, (node) => node instanceof render.Circle && node.name() === CONTROL_CLOSE_NAME);
  closeControl?.position({ x: CONTROL_START_X_PX, y: CONTROL_Y_PX });

  const minimizeControl = findChild<Konva.Circle>(group, (node) => node instanceof render.Circle && node.name() === CONTROL_MINIMIZE_NAME);
  minimizeControl?.position({ x: CONTROL_START_X_PX + CONTROL_RADIUS_PX * 2 + CONTROL_GAP_PX, y: CONTROL_Y_PX });

  const fullscreenControl = findChild<Konva.Circle>(group, (node) => node instanceof render.Circle && node.name() === CONTROL_FULLSCREEN_NAME);
  fullscreenControl?.position({ x: CONTROL_START_X_PX + (CONTROL_RADIUS_PX * 2 + CONTROL_GAP_PX) * 2, y: CONTROL_Y_PX });
}

function createHostedComponentNode(render: RenderService, element: TElement) {
  if (!isHostedComponentElement(element)) {
    return null;
  }

  const group = new render.Group({
    id: element.id,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    draggable: true,
    listening: true,
  });

  const hit = new render.Rect({
    name: HIT_NAME,
    x: 0,
    y: 0,
    width: element.data.w,
    height: element.data.h,
    fill: "#000000",
    opacity: 0.001,
    strokeEnabled: false,
    listening: true,
  });

  const windowRect = new render.Rect({
    name: WINDOW_NAME,
    x: 0,
    y: 0,
    width: element.data.w,
    height: element.data.h,
    cornerRadius: WINDOW_RADIUS_PX,
    fill: "#f8fafc",
    stroke: "rgba(15, 23, 42, 0.18)",
    strokeWidth: 1,
    listening: false,
  });

  const headerRect = new render.Rect({
    name: HEADER_NAME,
    x: 0,
    y: 0,
    width: element.data.w,
    height: HEADER_HEIGHT_PX,
    cornerRadius: [WINDOW_RADIUS_PX, WINDOW_RADIUS_PX, 0, 0],
    fill: "#f8fafc",
    listening: false,
  });

  const bodyRect = new render.Rect({
    name: BODY_NAME,
    x: 0,
    y: HEADER_HEIGHT_PX,
    width: element.data.w,
    height: Math.max(0, element.data.h - HEADER_HEIGHT_PX),
    cornerRadius: [0, 0, WINDOW_RADIUS_PX, WINDOW_RADIUS_PX],
    fill: getHostedBackgroundColor(element),
    listening: false,
  });

  const title = new render.Text({
    name: TITLE_NAME,
    x: 0,
    y: 0,
    width: element.data.w,
    height: HEADER_HEIGHT_PX,
    text: HEADER_TITLE,
    align: "center",
    verticalAlign: "middle",
    fontSize: 12,
    fill: "rgba(15, 23, 42, 0.72)",
    listening: false,
  });

  const closeControl = new render.Circle({
    name: CONTROL_CLOSE_NAME,
    x: CONTROL_START_X_PX,
    y: CONTROL_Y_PX,
    radius: CONTROL_RADIUS_PX,
    fill: "#ef4444",
    listening: false,
  });

  const minimizeControl = new render.Circle({
    name: CONTROL_MINIMIZE_NAME,
    x: CONTROL_START_X_PX + CONTROL_RADIUS_PX * 2 + CONTROL_GAP_PX,
    y: CONTROL_Y_PX,
    radius: CONTROL_RADIUS_PX,
    fill: "#f59e0b",
    listening: false,
  });

  const fullscreenControl = new render.Circle({
    name: CONTROL_FULLSCREEN_NAME,
    x: CONTROL_START_X_PX + (CONTROL_RADIUS_PX * 2 + CONTROL_GAP_PX) * 2,
    y: CONTROL_Y_PX,
    radius: CONTROL_RADIUS_PX,
    fill: "#22c55e",
    listening: false,
  });

  group.add(windowRect);
  group.add(headerRect);
  group.add(bodyRect);
  group.add(title);
  group.add(closeControl);
  group.add(minimizeControl);
  group.add(fullscreenControl);
  group.add(hit);

  syncHostedComponentGroup(render, group, element);
  return group;
}

function toHostedComponentElement(render: RenderService, node: Konva.Node, now: () => number): TElement | null {
  const group = findHostedComponentGroup(render, node);
  if (!(group instanceof render.Group)) {
    return null;
  }

  const updatedAt = now();
  const width = Number(group.getAttr(WIDTH_ATTR) ?? 160) * group.scaleX();
  const height = Number(group.getAttr(HEIGHT_ATTR) ?? 120) * group.scaleY();
  const backgroundColor = String(group.getAttr(BACKGROUND_ATTR) ?? "#6b7280");
  const parent = group.getParent();

  return {
    id: group.id(),
    x: group.x(),
    y: group.y(),
    rotation: group.rotation(),
    bindings: [],
    createdAt: Number(group.getAttr(CREATED_AT_ATTR) ?? updatedAt),
    updatedAt,
    locked: false,
    parentGroupId: parent instanceof render.Group ? parent.id() : null,
    zIndex: String(group.getAttr("vcZIndex") ?? ""),
    style: {
      backgroundColor,
      opacity: group.opacity(),
      strokeWidth: 0,
    },
    data: {
      type: "custom",
      w: width,
      h: height,
      expanded: true,
      payload: {
        kind: TOOL_ID,
        backgroundColor,
      },
    },
  };
}

function updateHostedComponentNode(render: RenderService, element: TElement) {
  if (!isHostedComponentElement(element)) {
    return false;
  }

  const node = render.staticForegroundLayer.findOne((candidate: unknown) => {
    return candidate instanceof render.Group && candidate.id() === element.id && candidate.getAttr(GROUP_KIND_ATTR) === TOOL_ID;
  });

  if (!(node instanceof render.Group)) {
    return false;
  }

  syncHostedComponentGroup(render, node, element);
  return true;
}

function getHostedComponentNodes(render: RenderService) {
  return render.staticForegroundLayer.find((candidate: Konva.Node) => {
    return candidate instanceof render.Group && candidate.getAttr(GROUP_KIND_ATTR) === TOOL_ID;
  }).filter((candidate): candidate is Konva.Group => candidate instanceof render.Group);
}

function syncHostedComponentOverlays(args: {
  render: RenderService;
  root: HTMLDivElement;
  overlays: Map<string, HTMLDivElement>;
}) {
  const activeIds = new Set<string>();

  getHostedComponentNodes(args.render).forEach((node) => {
    const id = node.id();
    activeIds.add(id);

    let overlay = args.overlays.get(id);
    if (!overlay) {
      overlay = args.render.container.ownerDocument.createElement("div");
      overlay.dataset.hostedComponentOverlayId = id;
      overlay.style.position = "absolute";
      overlay.style.pointerEvents = "none";
      overlay.style.background = "rgba(59, 130, 246, 0.35)";
      overlay.style.border = "1px solid rgba(59, 130, 246, 0.75)";
      overlay.style.boxSizing = "border-box";
      args.root.appendChild(overlay);
      args.overlays.set(id, overlay);
    }

    const rect = node.getClientRect();
    const width = Math.max(0, rect.width - OVERLAY_INSET_PX * 2);
    const height = Math.max(0, rect.height - HEADER_HEIGHT_PX - OVERLAY_INSET_PX * 2);

    overlay.style.display = width <= 0 || height <= 0 ? "none" : "block";
    overlay.style.left = `${rect.x + OVERLAY_INSET_PX}px`;
    overlay.style.top = `${rect.y + HEADER_HEIGHT_PX + OVERLAY_INSET_PX}px`;
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
  });

  for (const [id, overlay] of args.overlays.entries()) {
    if (activeIds.has(id)) {
      continue;
    }

    overlay.remove();
    args.overlays.delete(id);
  }
}

function setupHostedComponentOverlay(portal: TPortalSetupHostedComponent) {
  const overlays = new Map<string, HTMLDivElement>();
  let root: HTMLDivElement | null = null;
  let rafId = 0;

  const sync = () => {
    if (!root) {
      return;
    }

    syncHostedComponentOverlays({
      render: portal.render,
      root,
      overlays,
    });
  };

  const tick = () => {
    sync();
    rafId = portal.render.container.ownerDocument.defaultView?.requestAnimationFrame(tick) ?? 0;
  };

  portal.hooks.init.tap(() => {
    const document = portal.render.container.ownerDocument;
    root = document.createElement("div");
    root.dataset.hostedComponentOverlayRoot = "true";
    root.style.position = "absolute";
    root.style.inset = "0";
    root.style.pointerEvents = "none";
    root.style.overflow = "hidden";

    portal.render.container.style.position = "relative";
    portal.render.container.appendChild(root);
    sync();
    rafId = document.defaultView?.requestAnimationFrame(tick) ?? 0;
  });

  portal.hooks.destroy.tap(() => {
    if (rafId !== 0) {
      portal.render.container.ownerDocument.defaultView?.cancelAnimationFrame(rafId);
      rafId = 0;
    }

    overlays.forEach((overlay) => overlay.remove());
    overlays.clear();
    root?.remove();
    root = null;
  });
}

export function txSetupHostedComponent(portal: TPortalSetupHostedComponent, _args: TArgsSetupHostedComponent) {
  setupHostedComponentOverlay(portal);

  portal.editor.registerTool({
    id: TOOL_ID,
    label: "Hosted Component",
    icon: portal.icon,
    shortcuts: ["0"],
    priority: 15,
    behavior: { type: "mode", mode: "click-create" },
  });

  portal.editor.registerToElement(TOOL_ID, (node) => {
    return toHostedComponentElement(portal.render, node, portal.now);
  });

  portal.editor.registerCreateShapeFromTElement(TOOL_ID, (element) => {
    const node = createHostedComponentNode(portal.render, element);
    if (!(node instanceof portal.render.Group)) {
      return null;
    }

    portal.editor.setupExistingShape(node);
    return node;
  });

  portal.editor.registerSetupExistingShape(TOOL_ID, (node) => {
    const group = findHostedComponentGroup(portal.render, node);
    if (!(group instanceof portal.render.Group)) {
      return false;
    }

    const hit = findChild<Konva.Rect>(group, (candidate) => candidate instanceof portal.render.Rect && candidate.name() === HIT_NAME);
    if (!(hit instanceof portal.render.Rect)) {
      return false;
    }

    group.draggable(true);
    group.listening(true);
    hit.listening(true);
    hit.off("pointerclick pointerdown pointerdblclick");

    hit.on("pointerclick", (event) => {
      portal.hooks.elementPointerClick.call(event as never);
    });

    hit.on("pointerdown", (event) => {
      const didHandle = portal.hooks.elementPointerDown.call(event as never);
      if (didHandle) {
        event.cancelBubble = true;
      }
    });

    hit.on("pointerdblclick", (event) => {
      const didHandle = portal.hooks.elementPointerDoubleClick.call(event as never);
      if (didHandle) {
        event.cancelBubble = true;
      }
    });

    return true;
  });

  portal.editor.registerUpdateShapeFromTElement(TOOL_ID, (element) => {
    return updateHostedComponentNode(portal.render, element);
  });

  portal.hooks.toolSelect.tap((toolId) => {
    if (toolId !== TOOL_ID) {
      return;
    }

    portal.selection.clear();
  });

  portal.hooks.pointerUp.tap(() => {
    if (portal.selection.mode !== "click_create") {
      return;
    }

    if (portal.editor.activeToolId !== TOOL_ID) {
      return;
    }

    const pointer = portal.render.staticForegroundLayer.getRelativePointerPosition();
    if (!pointer) {
      return;
    }

    const timestamp = portal.now();
    const element = createHostedComponentElement({
      id: portal.createId(),
      x: pointer.x - 80,
      y: pointer.y - 60,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const node = portal.editor.createShapeFromTElement(element);
    if (!(node instanceof portal.render.Group)) {
      return;
    }

    portal.render.staticForegroundLayer.add(node);
    portal.renderOrder.assignOrderOnInsert({
      parent: portal.render.staticForegroundLayer,
      nodes: [node],
      position: "front",
    });

    const createdElement = toHostedComponentElement(portal.render, node, portal.now);
    if (!createdElement) {
      node.destroy();
      portal.render.staticForegroundLayer.batchDraw();
      portal.editor.setActiveTool("select");
      return;
    }

    portal.crdt.patch({ elements: [createdElement], groups: [] });
    portal.selection.setSelection([node]);
    portal.selection.setFocusedNode(node);
    portal.editor.setActiveTool("select");
    portal.render.staticForegroundLayer.batchDraw();
  });

  portal.hooks.destroy.tap(() => {
    portal.editor.unregisterTool(TOOL_ID);
    portal.editor.unregisterToElement(TOOL_ID);
    portal.editor.unregisterCreateShapeFromTElement(TOOL_ID);
    portal.editor.unregisterSetupExistingShape(TOOL_ID);
    portal.editor.unregisterUpdateShapeFromTElement(TOOL_ID);
  });
}
