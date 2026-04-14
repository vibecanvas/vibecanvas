import type { TCustomData, TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import { HOSTED_COMPONENT_BACKGROUND_ATTR, HOSTED_COMPONENT_BODY_NAME, HOSTED_COMPONENT_CONTROL_CLOSE_NAME, HOSTED_COMPONENT_CONTROL_FULLSCREEN_NAME, HOSTED_COMPONENT_CONTROL_GAP_PX, HOSTED_COMPONENT_CONTROL_MINIMIZE_NAME, HOSTED_COMPONENT_CONTROL_RADIUS_PX, HOSTED_COMPONENT_CONTROL_START_X_PX, HOSTED_COMPONENT_CONTROL_Y_PX, HOSTED_COMPONENT_CREATED_AT_ATTR, HOSTED_COMPONENT_DEFAULT_BACKGROUND, HOSTED_COMPONENT_DEFAULT_HEIGHT, HOSTED_COMPONENT_DEFAULT_WIDTH, HOSTED_COMPONENT_GROUP_KIND_ATTR, HOSTED_COMPONENT_HEADER_HEIGHT_PX, HOSTED_COMPONENT_HEADER_NAME, HOSTED_COMPONENT_HEADER_TITLE, HOSTED_COMPONENT_HEIGHT_ATTR, HOSTED_COMPONENT_HIT_NAME, HOSTED_COMPONENT_MINIMIZE_COLOR, HOSTED_COMPONENT_OVERLAY_BACKGROUND, HOSTED_COMPONENT_OVERLAY_BORDER, HOSTED_COMPONENT_OVERLAY_INSET_PX, HOSTED_COMPONENT_TITLE_COLOR, HOSTED_COMPONENT_TITLE_NAME, HOSTED_COMPONENT_TOOL_ID, HOSTED_COMPONENT_WIDTH_ATTR, HOSTED_COMPONENT_WINDOW_BACKGROUND, HOSTED_COMPONENT_WINDOW_NAME, HOSTED_COMPONENT_WINDOW_RADIUS_PX, HOSTED_COMPONENT_WINDOW_STROKE, HOSTED_COMPONENT_CLOSE_COLOR, HOSTED_COMPONENT_FULLSCREEN_COLOR } from "./CONSTANTS";
import { fxGetHostedComponentCreatePointer } from "./fx.get-hosted-component-create-pointer";
import { fxToHostedComponentElement } from "./fx.to-hosted-component-element";
import { txCreateHostedComponentOnPointerUp } from "./tx.create-hosted-component-on-pointer-up";
import { txMountArrowSandbox } from "./tx.mount-arrow-sandbox";
import { txSyncHostedComponentGroup } from "./tx.sync-hosted-component-group";
import { txSyncHostedComponentOverlays } from "./tx.sync-hosted-component-overlays";
import type { CrdtService } from "../../../new-services/crdt/CrdtService";
import type { EditorService, TEditorToolIcon } from "../../../new-services/editor/EditorService";
import type { RenderOrderService } from "../../../new-services/render-order/RenderOrderService";
import type { RenderService } from "../../../new-services/render/RenderService";
import type { SelectionService } from "../../../new-services/selection/SelectionService";
import type { IHooks } from "../../../runtime";

const TOOL_ID = HOSTED_COMPONENT_TOOL_ID;
const GROUP_KIND_ATTR = HOSTED_COMPONENT_GROUP_KIND_ATTR;
const CREATED_AT_ATTR = HOSTED_COMPONENT_CREATED_AT_ATTR;
const WIDTH_ATTR = HOSTED_COMPONENT_WIDTH_ATTR;
const HEIGHT_ATTR = HOSTED_COMPONENT_HEIGHT_ATTR;
const BACKGROUND_ATTR = HOSTED_COMPONENT_BACKGROUND_ATTR;
const OVERLAY_INSET_PX = HOSTED_COMPONENT_OVERLAY_INSET_PX;
const WINDOW_RADIUS_PX = HOSTED_COMPONENT_WINDOW_RADIUS_PX;
const HEADER_HEIGHT_PX = HOSTED_COMPONENT_HEADER_HEIGHT_PX;
const CONTROL_RADIUS_PX = HOSTED_COMPONENT_CONTROL_RADIUS_PX;
const CONTROL_GAP_PX = HOSTED_COMPONENT_CONTROL_GAP_PX;
const CONTROL_START_X_PX = HOSTED_COMPONENT_CONTROL_START_X_PX;
const CONTROL_Y_PX = HOSTED_COMPONENT_CONTROL_Y_PX;
const HEADER_TITLE = HOSTED_COMPONENT_HEADER_TITLE;
const HIT_NAME = HOSTED_COMPONENT_HIT_NAME;
const WINDOW_NAME = HOSTED_COMPONENT_WINDOW_NAME;
const HEADER_NAME = HOSTED_COMPONENT_HEADER_NAME;
const BODY_NAME = HOSTED_COMPONENT_BODY_NAME;
const TITLE_NAME = HOSTED_COMPONENT_TITLE_NAME;
const CONTROL_CLOSE_NAME = HOSTED_COMPONENT_CONTROL_CLOSE_NAME;
const CONTROL_MINIMIZE_NAME = HOSTED_COMPONENT_CONTROL_MINIMIZE_NAME;
const CONTROL_FULLSCREEN_NAME = HOSTED_COMPONENT_CONTROL_FULLSCREEN_NAME;
const DEFAULT_WIDTH = HOSTED_COMPONENT_DEFAULT_WIDTH;
const DEFAULT_HEIGHT = HOSTED_COMPONENT_DEFAULT_HEIGHT;
const DEFAULT_BACKGROUND = HOSTED_COMPONENT_DEFAULT_BACKGROUND;
const WINDOW_BACKGROUND = HOSTED_COMPONENT_WINDOW_BACKGROUND;
const WINDOW_STROKE = HOSTED_COMPONENT_WINDOW_STROKE;
const TITLE_COLOR = HOSTED_COMPONENT_TITLE_COLOR;
const CLOSE_COLOR = HOSTED_COMPONENT_CLOSE_COLOR;
const MINIMIZE_COLOR = HOSTED_COMPONENT_MINIMIZE_COLOR;
const FULLSCREEN_COLOR = HOSTED_COMPONENT_FULLSCREEN_COLOR;
const OVERLAY_BACKGROUND = HOSTED_COMPONENT_OVERLAY_BACKGROUND;
const OVERLAY_BORDER = HOSTED_COMPONENT_OVERLAY_BORDER;

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
  camera: import("../../../new-services/camera/CameraService").CameraService;
  crdt: CrdtService;
  editor: EditorService;
  hooks: IHooks;
  icon: TEditorToolIcon;
  now: () => number;
  createId: () => string;
  render: RenderService;
  arrow: {
    html: typeof import("@arrow-js/core").html;
    render: typeof import("@arrow-js/framework").render;
    sandbox: typeof import("@arrow-js/sandbox").sandbox;
  };
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
      onCreateOverlay: (overlay) => {
        overlay.style.pointerEvents = "auto";
      },
      onMountOverlay: (overlay) => {
        const HTMLElement = portal.render.container.ownerDocument.defaultView?.HTMLElement;
        if (!HTMLElement) {
          return;
        }

        txMountArrowSandbox({ root: overlay, arrow: portal.arrow, HTMLElement }, {});
      },
    });
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
  });

  portal.camera.hooks.change.tap(() => {
    sync();
  });

  portal.render.hooks.resize.tap(() => {
    sync();
  });

  portal.hooks.pointerMove.tap(() => {
    sync();
  });

  portal.hooks.pointerUp.tap(() => {
    sync();
  });

  portal.hooks.destroy.tap(() => {
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
    return fxToHostedComponentElement({ editor: portal.editor, render: portal.render }, {
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
        return fxToHostedComponentElement({ editor: portal.editor, render: portal.render }, {
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
