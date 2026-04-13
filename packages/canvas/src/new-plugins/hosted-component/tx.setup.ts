import type { TCustomData, TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import { fxGetHostedComponentCreatePointer } from "./fx.get-hosted-component-create-pointer";
import { fxToHostedComponentElement } from "./fx.to-hosted-component-element";
import { txCreateHostedComponentOnPointerUp } from "./tx.create-hosted-component-on-pointer-up";
import { txSyncHostedComponentGroup } from "./tx.sync-hosted-component-group";
import { txSyncHostedComponentOverlays } from "./tx.sync-hosted-component-overlays";
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
const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 120;
const DEFAULT_BACKGROUND = "#6b7280";
const WINDOW_BACKGROUND = "#f8fafc";
const WINDOW_STROKE = "rgba(15, 23, 42, 0.18)";
const TITLE_COLOR = "rgba(15, 23, 42, 0.72)";
const CLOSE_COLOR = "#ef4444";
const MINIMIZE_COLOR = "#f59e0b";
const FULLSCREEN_COLOR = "#22c55e";
const OVERLAY_BACKGROUND = "rgba(59, 130, 246, 0.35)";
const OVERLAY_BORDER = "1px solid rgba(59, 130, 246, 0.75)";

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

function isHostedComponentElement(element: TElement): element is THostedComponentElement {
  return element.data.type === "custom"
    && typeof element.data.payload === "object"
    && element.data.payload !== null
    && (element.data.payload as { kind?: unknown }).kind === TOOL_ID;
}

function getHostedBackgroundColor(element: THostedComponentElement) {
  return typeof element.data.payload.backgroundColor === "string"
    ? element.data.payload.backgroundColor
    : (element.style.backgroundColor ?? DEFAULT_BACKGROUND);
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
    fill: WINDOW_BACKGROUND,
    stroke: WINDOW_STROKE,
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
    fill: WINDOW_BACKGROUND,
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
    fill: TITLE_COLOR,
    listening: false,
  });

  const closeControl = new render.Circle({
    name: CONTROL_CLOSE_NAME,
    x: CONTROL_START_X_PX,
    y: CONTROL_Y_PX,
    radius: CONTROL_RADIUS_PX,
    fill: CLOSE_COLOR,
    listening: false,
  });

  const minimizeControl = new render.Circle({
    name: CONTROL_MINIMIZE_NAME,
    x: CONTROL_START_X_PX + CONTROL_RADIUS_PX * 2 + CONTROL_GAP_PX,
    y: CONTROL_Y_PX,
    radius: CONTROL_RADIUS_PX,
    fill: MINIMIZE_COLOR,
    listening: false,
  });

  const fullscreenControl = new render.Circle({
    name: CONTROL_FULLSCREEN_NAME,
    x: CONTROL_START_X_PX + (CONTROL_RADIUS_PX * 2 + CONTROL_GAP_PX) * 2,
    y: CONTROL_Y_PX,
    radius: CONTROL_RADIUS_PX,
    fill: FULLSCREEN_COLOR,
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

  txSyncHostedComponentGroup({ render }, {
    group,
    element,
    groupKindAttr: GROUP_KIND_ATTR,
    createdAtAttr: CREATED_AT_ATTR,
    widthAttr: WIDTH_ATTR,
    heightAttr: HEIGHT_ATTR,
    backgroundAttr: BACKGROUND_ATTR,
    kind: TOOL_ID,
    hitName: HIT_NAME,
    windowName: WINDOW_NAME,
    headerName: HEADER_NAME,
    bodyName: BODY_NAME,
    titleName: TITLE_NAME,
    controlCloseName: CONTROL_CLOSE_NAME,
    controlMinimizeName: CONTROL_MINIMIZE_NAME,
    controlFullscreenName: CONTROL_FULLSCREEN_NAME,
    windowRadiusPx: WINDOW_RADIUS_PX,
    headerHeightPx: HEADER_HEIGHT_PX,
    controlRadiusPx: CONTROL_RADIUS_PX,
    controlGapPx: CONTROL_GAP_PX,
    controlStartXPx: CONTROL_START_X_PX,
    controlYPx: CONTROL_Y_PX,
    headerTitle: HEADER_TITLE,
    windowBackground: WINDOW_BACKGROUND,
    windowStroke: WINDOW_STROKE,
    titleColor: TITLE_COLOR,
    defaultBackgroundColor: DEFAULT_BACKGROUND,
  });
  return group;
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

  return txSyncHostedComponentGroup({ render }, {
    group: node,
    element,
    groupKindAttr: GROUP_KIND_ATTR,
    createdAtAttr: CREATED_AT_ATTR,
    widthAttr: WIDTH_ATTR,
    heightAttr: HEIGHT_ATTR,
    backgroundAttr: BACKGROUND_ATTR,
    kind: TOOL_ID,
    hitName: HIT_NAME,
    windowName: WINDOW_NAME,
    headerName: HEADER_NAME,
    bodyName: BODY_NAME,
    titleName: TITLE_NAME,
    controlCloseName: CONTROL_CLOSE_NAME,
    controlMinimizeName: CONTROL_MINIMIZE_NAME,
    controlFullscreenName: CONTROL_FULLSCREEN_NAME,
    windowRadiusPx: WINDOW_RADIUS_PX,
    headerHeightPx: HEADER_HEIGHT_PX,
    controlRadiusPx: CONTROL_RADIUS_PX,
    controlGapPx: CONTROL_GAP_PX,
    controlStartXPx: CONTROL_START_X_PX,
    controlYPx: CONTROL_Y_PX,
    headerTitle: HEADER_TITLE,
    windowBackground: WINDOW_BACKGROUND,
    windowStroke: WINDOW_STROKE,
    titleColor: TITLE_COLOR,
    defaultBackgroundColor: DEFAULT_BACKGROUND,
  });
}

function setupHostedComponentOverlay(portal: TPortalSetupHostedComponent) {
  const overlays = new Map<string, HTMLDivElement>();
  let root: HTMLDivElement | null = null;
  let rafId = 0;

  const sync = () => {
    if (!root) {
      return;
    }

    txSyncHostedComponentOverlays({ render: portal.render }, {
      root,
      overlays,
      kind: TOOL_ID,
      groupKindAttr: GROUP_KIND_ATTR,
      overlayInsetPx: OVERLAY_INSET_PX,
      headerHeightPx: HEADER_HEIGHT_PX,
      overlayBackground: OVERLAY_BACKGROUND,
      overlayBorder: OVERLAY_BORDER,
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

export function txSetupHostedComponent(portal: TPortalSetupHostedComponent, args: TArgsSetupHostedComponent) {
  void args;
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
    return fxToHostedComponentElement({ render: portal.render }, {
      node,
      kind: TOOL_ID,
      groupKindAttr: GROUP_KIND_ATTR,
      createdAtAttr: CREATED_AT_ATTR,
      widthAttr: WIDTH_ATTR,
      heightAttr: HEIGHT_ATTR,
      backgroundAttr: BACKGROUND_ATTR,
      defaultWidth: DEFAULT_WIDTH,
      defaultHeight: DEFAULT_HEIGHT,
      defaultBackgroundColor: DEFAULT_BACKGROUND,
      now: portal.now,
    });
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

    const pointer = fxGetHostedComponentCreatePointer({ render: portal.render }, {});
    if (!pointer) {
      return;
    }

    txCreateHostedComponentOnPointerUp({
      crdt: portal.crdt,
      editor: portal.editor,
      render: portal.render,
      renderOrder: portal.renderOrder,
      selection: portal.selection,
      createId: portal.createId,
      now: portal.now,
    }, {
      pointer,
      kind: TOOL_ID,
      defaultWidth: DEFAULT_WIDTH,
      defaultHeight: DEFAULT_HEIGHT,
      defaultBackgroundColor: DEFAULT_BACKGROUND,
      createNode: (element) => portal.editor.createShapeFromTElement(element),
      toElement: (node) => {
        return fxToHostedComponentElement({ render: portal.render }, {
          node,
          kind: TOOL_ID,
          groupKindAttr: GROUP_KIND_ATTR,
          createdAtAttr: CREATED_AT_ATTR,
          widthAttr: WIDTH_ATTR,
          heightAttr: HEIGHT_ATTR,
          backgroundAttr: BACKGROUND_ATTR,
          defaultWidth: DEFAULT_WIDTH,
          defaultHeight: DEFAULT_HEIGHT,
          defaultBackgroundColor: DEFAULT_BACKGROUND,
          now: portal.now,
        });
      },
    });
  });

  portal.hooks.destroy.tap(() => {
    portal.editor.unregisterTool(TOOL_ID);
    portal.editor.unregisterToElement(TOOL_ID);
    portal.editor.unregisterCreateShapeFromTElement(TOOL_ID);
    portal.editor.unregisterSetupExistingShape(TOOL_ID);
    portal.editor.unregisterUpdateShapeFromTElement(TOOL_ID);
  });
}
