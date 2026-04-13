import type { TCustomData, TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService, TEditorToolIcon } from "../../new-services/editor/EditorService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { IHooks } from "../../runtime";

const TOOL_ID = "example-ui";
const NODE_KIND_ATTR = "vcExampleUiKind";
const CREATED_AT_ATTR = "vcExampleUiCreatedAt";

type TExampleUiPayload = {
  kind: typeof TOOL_ID;
  backgroundColor: string;
};

type TExampleUiElement = Omit<TElement, "data"> & {
  data: TCustomData & {
    payload: TExampleUiPayload;
  };
};

export type TPortalSetupExampleUi = {
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

export type TArgsSetupExampleUi = {};

function createRectElement(args: {
  id: string;
  x: number;
  y: number;
  createdAt: number;
  updatedAt: number;
}): TElement {
  const data: TCustomData = {
    type: "custom",
    w: 120,
    h: 80,
    expanded: true,
    payload: {
      kind: TOOL_ID,
      backgroundColor: "gray",
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
      backgroundColor: "red",
      opacity: 1,
      strokeWidth: 0,
    },
    data,
  };
}

function isExampleUiElement(element: TElement): element is TExampleUiElement {
  return element.data.type === "custom"
    && typeof element.data.payload === "object"
    && element.data.payload !== null
    && (element.data.payload as { kind?: unknown }).kind === TOOL_ID;
}

function createRectNode(render: RenderService, element: TElement) {
  if (!isExampleUiElement(element)) {
    return null;
  }

  const payload = element.data.payload;
  const node = new render.Rect({
    id: element.id,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    width: element.data.w,
    height: element.data.h,
    fill: typeof payload.backgroundColor === "string" ? payload.backgroundColor : element.style.backgroundColor,
    opacity: element.style.opacity ?? 1,
    strokeWidth: element.style.strokeWidth ?? 0,
    draggable: true,
    listening: true,
  });

  node.setAttr(NODE_KIND_ATTR, TOOL_ID);
  node.setAttr(CREATED_AT_ATTR, element.createdAt);
  return node;
}

function toRectElement(render: RenderService, node: Konva.Node, now: () => number): TElement | null {
  if (!(node instanceof render.Rect)) {
    return null;
  }

  if (node.getAttr(NODE_KIND_ATTR) !== TOOL_ID) {
    return null;
  }

  const updatedAt = now();

  return {
    id: node.id(),
    x: node.x(),
    y: node.y(),
    rotation: node.rotation(),
    bindings: [],
    createdAt: Number(node.getAttr(CREATED_AT_ATTR) ?? updatedAt),
    updatedAt,
    locked: false,
    parentGroupId: null,
    zIndex: "",
    style: {
      backgroundColor: typeof node.fill() === "string" ? (node.fill() as string) : "red",
      opacity: node.opacity(),
      strokeWidth: node.strokeWidth(),
    },
    data: {
      type: "custom",
      w: node.width() * node.scaleX(),
      h: node.height() * node.scaleY(),
      expanded: true,
      payload: {
        kind: TOOL_ID,
        backgroundColor: typeof node.fill() === "string" ? node.fill() : "red",
      },
    },
  };
}

function updateRectNode(render: RenderService, element: TElement) {
  if (!isExampleUiElement(element)) {
    return false;
  }

  const node = render.staticForegroundLayer.findOne((candidate: unknown) => {
    return candidate instanceof render.Rect && candidate.id() === element.id && candidate.getAttr(NODE_KIND_ATTR) === TOOL_ID;
  });

  if (!(node instanceof render.Rect)) {
    return false;
  }

  node.position({ x: element.x, y: element.y });
  node.rotation(element.rotation);
  node.width(element.data.w);
  node.height(element.data.h);
  node.scale({ x: 1, y: 1 });
  node.fill(typeof element.data.payload.backgroundColor === "string" ? element.data.payload.backgroundColor : (element.style.backgroundColor ?? "red"));
  node.opacity(element.style.opacity ?? 1);
  node.strokeWidth(element.style.strokeWidth ?? 0);
  node.draggable(true);
  node.listening(true);
  node.setAttr(NODE_KIND_ATTR, TOOL_ID);
  node.setAttr(CREATED_AT_ATTR, element.createdAt);
  return true;
}

export function txSetupExampleUi(portal: TPortalSetupExampleUi, _args: TArgsSetupExampleUi) {
  portal.editor.registerTool({
    id: TOOL_ID,
    label: "Example UI",
    icon: portal.icon,
    shortcuts: ["0"],
    priority: 15,
    behavior: { type: "mode", mode: "click-create" },
  });

  portal.editor.registerToElement(TOOL_ID, (node) => {
    return toRectElement(portal.render, node, portal.now);
  });

  portal.editor.registerCreateShapeFromTElement(TOOL_ID, (element) => {
    const node = createRectNode(portal.render, element);
    if (!(node instanceof portal.render.Rect)) {
      return null;
    }

    portal.editor.setupExistingShape(node);
    return node;
  });

  portal.editor.registerSetupExistingShape(TOOL_ID, (node) => {
    if (!(node instanceof portal.render.Rect)) {
      return false;
    }

    if (node.getAttr(NODE_KIND_ATTR) !== TOOL_ID) {
      return false;
    }

    node.draggable(true);
    node.listening(true);
    node.off("pointerclick pointerdown pointerdblclick");

    node.on("pointerclick", (event) => {
      portal.hooks.elementPointerClick.call(event);
    });

    node.on("pointerdown", (event) => {
      const didHandle = portal.hooks.elementPointerDown.call(event);
      if (didHandle) {
        event.cancelBubble = true;
      }
    });

    node.on("pointerdblclick", (event) => {
      const didHandle = portal.hooks.elementPointerDoubleClick.call(event);
      if (didHandle) {
        event.cancelBubble = true;
      }
    });

    return true;
  });

  portal.editor.registerUpdateShapeFromTElement(TOOL_ID, (element) => {
    return updateRectNode(portal.render, element);
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
    const element = createRectElement({
      id: portal.createId(),
      x: pointer.x - 60,
      y: pointer.y - 40,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const node = createRectNode(portal.render, element);
    if (!(node instanceof portal.render.Rect)) {
      return;
    }

    portal.render.staticForegroundLayer.add(node);
    portal.renderOrder.assignOrderOnInsert({
      parent: portal.render.staticForegroundLayer,
      nodes: [node],
      position: "front",
    });

    const createdElement = toRectElement(portal.render, node, portal.now);
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
