import { throttle } from "@solid-primitives/scheduled";
import type { JSX } from "solid-js";
import { createSignal, Show } from "solid-js";
import { render } from "solid-js/web";
import type { TChatData, TElement, TFileData, TFiletreeData, TTerminalData } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import FrameIcon from "lucide-solid/icons/frame";
import RefreshCw from "lucide-solid/icons/refresh-cw";
import XIcon from "lucide-solid/icons/x";
import { FileHostedWidget } from "../components/file";
import { getFileName, getFileRenderer } from "../components/file/utils";
import { FiletreeHostedWidget } from "../components/filetree";
import { TerminalHostedWidget } from "../components/terminal";
import type { TTool } from "../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../custom-events";
import { CanvasMode } from "../services/canvas/enum";
import type {
  THostedWidgetElementMap,
  THostedWidgetType,
} from "../services/canvas/interface";
import type { IPlugin, IPluginContext } from "./interface";
import { getWorldPosition, setWorldPosition } from "./node-space";
import { getNodeZIndex, setNodeZIndex } from "./render-order.shared";
import { TransformPlugin } from "./Transform.plugin";

const HOSTED_TYPES = new Set<THostedWidgetType>(["chat", "filetree", "terminal", "file"]);
const TOOL_TO_WIDGET_TYPE: Partial<Record<TTool, THostedWidgetType>> = {
  chat: "chat",
  filesystem: "filetree",
  terminal: "terminal",
};
const HOSTED_NODE_ATTR = "vcHostedWidget";
const HOSTED_TYPE_ATTR = "vcHostedWidgetType";
const HOSTED_ELEMENT_ATTR = "vcHostedElementSnapshot";
const HOSTED_TRANSFORMER_VISIBLE_ATTR = "vcHostedTransformerVisible";
const HOSTED_WIDGET_CLASS = "vc-hosted-widget";
const LAST_FILETREE_PATH_KEY = "vibecanvas-filetree-last-path";
const FILETREE_CHAT_DND_MIME = "application/x-vibecanvas-filetree-node";

type TDroppedNode = {
  path: string;
  name: string;
  is_dir: boolean;
};

type THostedWidgetElement = THostedWidgetElementMap[THostedWidgetType];

type TBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zoom: number;
};

type TMountRecord = {
  node: Konva.Rect;
  mountElement: HTMLDivElement;
  dispose: () => void;
  setElement: (element: THostedWidgetElement) => void;
  beforeRemove: () => void | Promise<void>;
  setBeforeRemove: (handler: (() => void | Promise<void>) | null) => void;
  setAutoSize: (handler: ((size: { width: number; height: number }) => void) | null) => void;
};

function isHostedType(type: string): type is THostedWidgetType {
  return HOSTED_TYPES.has(type as THostedWidgetType);
}

function getWidgetTypeFromTool(tool: TTool) {
  return TOOL_TO_WIDGET_TYPE[tool] ?? null;
}

function screenToWorld(context: IPluginContext, point: { x: number; y: number }) {
  const containerRect = context.stage.container().getBoundingClientRect();
  const inverted = context.staticForegroundLayer.getAbsoluteTransform().copy().invert();
  return inverted.point({
    x: point.x - containerRect.left,
    y: point.y - containerRect.top,
  });
}

function parseDroppedNode(event: DragEvent): TDroppedNode | null {
  const raw = event.dataTransfer?.getData(FILETREE_CHAT_DND_MIME);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<TDroppedNode>;
    if (typeof parsed.path !== "string") return null;
    if (typeof parsed.name !== "string") return null;
    if (typeof parsed.is_dir !== "boolean") return null;
    return parsed as TDroppedNode;
  } catch {
    return null;
  }
}

function createFileElementFromDrop(args: { id?: string; x: number; y: number; path: string }) {
  const now = Date.now();
  return {
    id: args.id ?? crypto.randomUUID(),
    x: args.x - 280,
    y: args.y - 250,
    rotation: 0,
    zIndex: "",
    parentGroupId: null,
    bindings: [],
    locked: false,
    createdAt: now,
    updatedAt: now,
    style: {
      backgroundColor: "#f8fafc",
      borderColor: "#cbd5e1",
      headerColor: "#e2e8f0",
      opacity: 1,
    },
    data: {
      type: "file",
      w: 560,
      h: 500,
      path: args.path,
      renderer: getFileRenderer(args.path),
      isCollapsed: false,
    } satisfies TFileData,
  } as THostedWidgetElementMap["file"];
}

function getWidgetHeaderLabel(element: THostedWidgetElement) {
  if (element.data.type === "terminal") return "untitled";
  if (element.data.type === "chat") return "chat";
  if (element.data.type === "filetree") return "files";
  if (element.data.type === "file") return getFileName(element.data.path);
  return "widget";
}

function getDefaultWidgetElement(type: THostedWidgetType, x: number, y: number, id = crypto.randomUUID()): THostedWidgetElement {
  const now = Date.now();

  if (type === "chat") {
    return {
      id,
      x,
      y,
      rotation: 0,
      zIndex: "",
      parentGroupId: null,
      bindings: [],
      locked: false,
      createdAt: now,
      updatedAt: now,
      style: {
        backgroundColor: "#f8fafc",
        borderColor: "#cbd5e1",
        headerColor: "#e2e8f0",
        opacity: 1,
      },
      data: {
        type: "chat",
        w: 420,
        h: 320,
        isCollapsed: false,
      } satisfies TChatData,
    };
  }

  if (type === "filetree") {
    return {
      id,
      x,
      y,
      rotation: 0,
      zIndex: "",
      parentGroupId: null,
      bindings: [],
      locked: false,
      createdAt: now,
      updatedAt: now,
      style: {
        backgroundColor: "#f8fafc",
        borderColor: "#cbd5e1",
        headerColor: "#dcfce7",
        opacity: 1,
      },
      data: {
        type: "filetree",
        w: 360,
        h: 460,
        isCollapsed: false,
        globPattern: null,
      } satisfies TFiletreeData,
    };
  }

  if (type === "file") {
    return createFileElementFromDrop({ id, x, y, path: "untitled.txt" });
  }

  return {
    id,
    x,
    y,
    rotation: 0,
    zIndex: "",
    parentGroupId: null,
    bindings: [],
    locked: false,
    createdAt: now,
    updatedAt: now,
    style: {
      backgroundColor: "#111827",
      borderColor: "#0f172a",
      headerColor: "#1f2937",
      opacity: 1,
    },
    data: {
      type: "terminal",
      w: 460,
      h: 300,
      isCollapsed: false,
      workingDirectory: ".",
    } satisfies TTerminalData,
  };
}

function collectSelectionShapes(context: IPluginContext, roots: Array<Konva.Group | Konva.Shape>) {
  const shapes: Konva.Shape[] = [];
  const seen = new Set<string>();

  const visit = (node: Konva.Group | Konva.Shape) => {
    if (seen.has(node.id())) return;
    seen.add(node.id());

    if (node instanceof Konva.Group) {
      node.getChildren().forEach((child) => {
        if (child instanceof Konva.Group || child instanceof Konva.Shape) {
          visit(child);
        }
      });
      return;
    }

    shapes.push(node);
  };

  roots.forEach(visit);
  return shapes;
}

function getScreenBounds(node: Konva.Rect): TBounds {
  const width = node.width();
  const height = node.height();
  const absoluteTransform = node.getAbsoluteTransform().copy();
  const topLeft = absoluteTransform.point({ x: 0, y: 0 });
  const topRight = absoluteTransform.point({ x: width, y: 0 });
  const bottomLeft = absoluteTransform.point({ x: 0, y: height });
  const widthScreen = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
  const heightScreen = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y);
  const rotation = Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x) * 180 / Math.PI;
  const zoom = node.getLayer()?.scaleX() ?? 1;

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: widthScreen / (zoom || 1),
    height: heightScreen / (zoom || 1),
    rotation,
    zoom,
  };
}

function getPointerWorldPoint(context: IPluginContext, point: { x: number; y: number }) {
  const containerRect = context.stage.container().getBoundingClientRect();
  const inverted = context.staticForegroundLayer.getAbsoluteTransform().copy().invert();
  return inverted.point({
    x: point.x - containerRect.left,
    y: point.y - containerRect.top,
  });
}

function getOrderKey(node: Konva.Node) {
  const parts: string[] = [];
  let current: Konva.Node | null = node;

  while (current) {
    if (current instanceof Konva.Group || current instanceof Konva.Shape) {
      parts.push(`${getNodeZIndex(current)}:${current.id()}`);
    }
    current = current.getParent();
  }

  return parts.reverse().join("/");
}

function HostedWidgetShell(props: {
  element: () => THostedWidgetElement;
  onHeaderPointerDown: (event: PointerEvent | MouseEvent) => void;
  onHeaderDoubleClick: (event: MouseEvent) => void;
  onSelectPointerDown: (event: PointerEvent | MouseEvent) => void;
  onRemove: () => void;
  onReload?: () => void;
  children?: JSX.Element;
}) {
  const titleColor = () => props.element().data.type === "terminal" ? "#f8fafc" : "#0f172a";
  const headerBackground = () => props.element().data.type === "terminal"
    ? "#0b1220"
    : (props.element().style.headerColor ?? "#e5e7eb");
  const secondaryTextColor = () => props.element().data.type === "terminal" ? "#94a3b8" : "#475569";

  return (
    <div
      data-hosted-widget-root="true"
      style={{
        position: "absolute",
        inset: "0",
        display: "flex",
        "flex-direction": "column",
        "pointer-events": "auto",
        "box-sizing": "border-box",
        border: `1px solid ${props.element().style.borderColor ?? "#cbd5e1"}`,
        background: props.element().style.backgroundColor ?? "#ffffff",
        "box-shadow": "0 8px 24px rgba(15,23,42,0.16)",
        overflow: "hidden",
        "font-family": "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
      onPointerDown={(event) => props.onSelectPointerDown(event)}
    >
      <div
        data-hosted-widget-header="true"
        style={{
          display: "flex",
          "align-items": "center",
          "justify-content": "space-between",
          gap: "8px",
          padding: "8px 10px",
          background: headerBackground(),
          "border-bottom": `1px solid ${props.element().style.borderColor ?? "#cbd5e1"}`,
          cursor: "grab",
          "user-select": "none",
        }}
        onPointerDown={(event) => props.onHeaderPointerDown(event)}
        onDblClick={(event) => props.onHeaderDoubleClick(event)}
      >
        <div style={{ display: "flex", "align-items": "baseline", gap: "8px", overflow: "hidden", "min-width": "0" }}>
          <div style={{ "font-size": "12px", color: titleColor(), "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis" }}>
            {getWidgetHeaderLabel(props.element())}
          </div>
          <Show when={props.element().data.type === "terminal"}>
            <div style={{ "font-size": "10px", color: secondaryTextColor(), "text-transform": "uppercase", "letter-spacing": "0.08em" }}>
              interactive terminal
            </div>
          </Show>
        </div>
        <div style={{ display: "flex", "align-items": "center", gap: "6px" }}>
          <button
            type="button"
            aria-label="Show resize handles"
            title="Resize"
            style={{
              display: "inline-flex",
              "align-items": "center",
              "justify-content": "center",
              width: "24px",
              height: "24px",
              border: `1px solid ${props.element().data.type === "terminal" ? "#334155" : (props.element().style.borderColor ?? "#cbd5e1")}`,
              background: props.element().data.type === "terminal" ? "#111827" : "#ffffff",
              color: titleColor(),
              cursor: "pointer",
              "pointer-events": "auto",
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              props.onHeaderDoubleClick(event);
            }}
          >
            <FrameIcon size={13} />
          </button>
          <button
            type="button"
            aria-label="Reload widget"
            title="Reload"
            style={{
              display: props.element().data.type === "terminal" && props.onReload ? "inline-flex" : "none",
              "align-items": "center",
              "justify-content": "center",
              width: "24px",
              height: "24px",
              border: `1px solid ${props.element().data.type === "terminal" ? "#334155" : (props.element().style.borderColor ?? "#cbd5e1")}`,
              background: props.element().data.type === "terminal" ? "#111827" : "#ffffff",
              color: titleColor(),
              cursor: "pointer",
              "pointer-events": "auto",
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              props.onReload?.();
            }}
          >
            <RefreshCw size={13} />
          </button>
          <button
            type="button"
            aria-label="Close widget"
            title="Close"
            style={{
              display: "inline-flex",
              "align-items": "center",
              "justify-content": "center",
              width: "24px",
              height: "24px",
              border: `1px solid ${props.element().data.type === "terminal" ? "#334155" : (props.element().style.borderColor ?? "#cbd5e1")}`,
              background: props.element().data.type === "terminal" ? "#111827" : "#ffffff",
              color: titleColor(),
              cursor: "pointer",
              "pointer-events": "auto",
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              props.onRemove();
            }}
          >
            <XIcon size={14} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Show when={props.children} fallback={<DefaultWidgetBody element={props.element} />}>
          {props.children}
        </Show>
      </div>
    </div>
  );
}

function DefaultWidgetBody(props: { element: () => THostedWidgetElement }) {
  const element = () => props.element();

  return (
    <div style={{ flex: 1, display: "flex", "flex-direction": "column", padding: "14px", gap: "10px", color: "#0f172a" }}>
      <div style={{ "font-size": "12px", color: "#475569" }}>
        Hosted Solid widget placeholder for `{element().data.type}`.
      </div>
      <Show when={element().data.type === "chat"}>
        <div style={{ display: "grid", gap: "8px" }}>
          <div style={{ padding: "10px", border: "1px solid #cbd5e1", background: "#ffffff" }}>User: sketch a layout</div>
          <div style={{ padding: "10px", border: "1px solid #cbd5e1", background: "#eff6ff" }}>Agent: hosted chat mounts here</div>
        </div>
      </Show>
      <Show when={element().data.type === "filetree"}>
        <div style={{ display: "grid", gap: "6px", "font-size": "12px" }}>
          <div>src/</div>
          <div style={{ "padding-left": "14px" }}>components/</div>
          <div style={{ "padding-left": "28px" }}>canvas.tsx</div>
          <div style={{ "padding-left": "14px" }}>plugins/</div>
          <div style={{ "padding-left": "28px" }}>HostedSolidWidget.plugin.tsx</div>
        </div>
      </Show>
      <Show when={element().data.type === "terminal"}>
        <div style={{ flex: 1, padding: "12px", background: "#020617", color: "#d1fae5", "font-size": "12px", overflow: "hidden" }}>
          <div>$ vibecanvas dev</div>
          <div>ready to host terminal UI here</div>
          <Show when={element().data.type === "terminal"}>
            <div style={{ color: "#67e8f9", "margin-top": "8px" }}>
              cwd: {(element().data as TTerminalData).workingDirectory}
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}

export class HostedSolidWidgetPlugin implements IPlugin {
  #activeTool: TTool = "select";
  #mounts = new Map<string, TMountRecord>();
  #cleanupDrag: (() => void) | null = null;

  apply(context: IPluginContext): void {
    this.setupCapabilities(context);
    this.setupToolState(context);
    this.setupClickCreate(context);
    this.setupFiletreeNodeDrop(context);

    context.capabilities.hostedWidgets = {
      isHostedNode: (node) => HostedSolidWidgetPlugin.isHostedNode(node),
      syncNode: (node) => {
        if (!(node instanceof Konva.Rect)) return;
        this.syncMountedNode(node);
      },
      removeNode: (id) => {
        this.unmountWidget(id);
      },
      syncDomOrder: () => {
        this.syncDomOrder();
      },
    };

    context.hooks.cameraChange.tap(() => {
      this.#mounts.forEach(({ node }) => this.syncMountedNode(node));
    });

    context.hooks.destroy.tap(() => {
      this.#cleanupDrag?.();
      this.#cleanupDrag = null;
      [...this.#mounts.keys()].forEach((id) => this.unmountWidget(id));
    });
  }

  static isHostedNode(node: Konva.Node | null | undefined): node is Konva.Rect {
    return node instanceof Konva.Rect && node.getAttr(HOSTED_NODE_ATTR) === true;
  }

  private setupToolState(context: IPluginContext) {
    context.hooks.customEvent.tap((event, payload) => {
      if (event !== CustomEvents.TOOL_SELECT) return false;
      this.#activeTool = payload as TTool;
      return false;
    });
  }

  private insertHostedElement(context: IPluginContext, element: THostedWidgetElement) {
    const node = this.createHostedNode(context, element);
    context.staticForegroundLayer.add(node);
    context.capabilities.renderOrder?.assignOrderOnInsert({
      parent: context.staticForegroundLayer,
      nodes: [node],
      position: "front",
    });
    context.crdt.patch({ elements: [this.toElement(node)], groups: [] });
    context.setState("selection", [node]);
    return node;
  }

  private async createFiletreeWidget(context: IPluginContext, pointer: { x: number; y: number }, initialPath?: string) {
    const filetreeCapability = context.capabilities.filetree;
    if (!filetreeCapability) {
      context.capabilities.notification?.showError("Filetree transport is not configured");
      return;
    }

    const lastFiletreePath = initialPath ?? localStorage.getItem(LAST_FILETREE_PATH_KEY) ?? undefined;
    const [error, filetree] = await filetreeCapability.safeClient.api.filetree.create({
      canvas_id: filetreeCapability.canvasId,
      x: pointer.x,
      y: pointer.y,
      ...(lastFiletreePath ? { path: lastFiletreePath } : {}),
    });

    if (error || !filetree) {
      const message = error && "message" in (error as object)
        ? (error as { message?: string }).message ?? "Failed to create file tree"
        : "Failed to create file tree";
      context.capabilities.notification?.showError("Failed to create file tree", message);
      return;
    }

    if (filetree.path) {
      localStorage.setItem(LAST_FILETREE_PATH_KEY, filetree.path);
    }

    const element = getDefaultWidgetElement("filetree", pointer.x, pointer.y, filetree.id);
    this.insertHostedElement(context, element);
  }

  private setupClickCreate(context: IPluginContext) {
    context.hooks.pointerUp.tap(() => {
      if (context.state.mode !== CanvasMode.CLICK_CREATE) return;
      const widgetType = getWidgetTypeFromTool(this.#activeTool);
      if (!widgetType) return;

      const pointer = context.staticForegroundLayer.getRelativePointerPosition();
      if (!pointer) return;

      context.setState("mode", CanvasMode.SELECT);
      context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "select");

      if (widgetType === "filetree") {
        void this.createFiletreeWidget(context, pointer);
        return;
      }

      const element = getDefaultWidgetElement(widgetType, pointer.x, pointer.y);
      this.insertHostedElement(context, element);
    });
  }

  private setupFiletreeNodeDrop(context: IPluginContext) {
    const container = context.stage.container();

    const onDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes(FILETREE_CHAT_DND_MIME)) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
    };

    const onDrop = (event: DragEvent) => {
      const node = parseDroppedNode(event);
      if (!node) return;

      event.preventDefault();
      const point = screenToWorld(context, { x: event.clientX, y: event.clientY });

      if (node.is_dir) {
        void this.createFiletreeWidget(context, point, node.path);
        return;
      }

      if (!context.capabilities.file) {
        context.capabilities.notification?.showError("File transport is not configured");
        return;
      }

      const element = createFileElementFromDrop({
        x: point.x,
        y: point.y,
        path: node.path,
      });
      this.insertHostedElement(context, element);
    };

    container.addEventListener("dragover", onDragOver);
    container.addEventListener("drop", onDrop);
    context.hooks.destroy.tap(() => {
      container.removeEventListener("dragover", onDragOver);
      container.removeEventListener("drop", onDrop);
    });
  }

  private setupCapabilities(context: IPluginContext) {
    const previousCreate = context.capabilities.createShapeFromTElement;
    context.capabilities.createShapeFromTElement = (element) => {
      if (!isHostedType(element.data.type)) return previousCreate?.(element) ?? null;
      const node = this.createHostedNode(context, element as THostedWidgetElement);
      return node;
    };

    const previousUpdate = context.capabilities.updateShapeFromTElement;
    context.capabilities.updateShapeFromTElement = (element) => {
      if (!isHostedType(element.data.type)) return previousUpdate?.(element) ?? null;
      const node = context.staticForegroundLayer.findOne((candidate: Konva.Node) => candidate.id() === element.id);
      if (!(node instanceof Konva.Rect) || !HostedSolidWidgetPlugin.isHostedNode(node)) return null;
      this.updateHostedNode(node, element as THostedWidgetElement);
      return node;
    };

    const previousToElement = context.capabilities.toElement;
    context.capabilities.toElement = (node) => {
      if (HostedSolidWidgetPlugin.isHostedNode(node)) {
        return this.toElement(node);
      }
      return previousToElement?.(node) ?? null;
    };
  }

  private createHostedNode(context: IPluginContext, element: THostedWidgetElement) {
    const node = new Konva.Rect({
      id: element.id,
      x: element.x,
      y: element.y,
      width: element.data.w,
      height: element.data.h,
      rotation: element.rotation,
      fill: "#000000",
      opacity: 0.001,
      listening: true,
      draggable: true,
      strokeEnabled: false,
    });

    node.name(HOSTED_WIDGET_CLASS);
    node.setAttr(HOSTED_NODE_ATTR, true);
    node.setAttr(HOSTED_TYPE_ATTR, element.data.type);
    node.setAttr(HOSTED_ELEMENT_ATTR, structuredClone(element));
    node.setAttr(HOSTED_TRANSFORMER_VISIBLE_ATTR, false);
    setNodeZIndex(node, element.zIndex);

    this.setupNodeListeners(context, node);
    this.mountWidget(context, node, element);
    queueMicrotask(() => {
      if (!this.#mounts.has(node.id())) return;
      this.syncMountedNode(node);
      this.syncDomOrder();
    });

    return node;
  }

  private updateHostedNode(node: Konva.Rect, element: THostedWidgetElement) {
    node.width(element.data.w);
    node.height(element.data.h);
    node.rotation(element.rotation);
    node.scale({ x: 1, y: 1 });
    node.skew({ x: 0, y: 0 });
    setWorldPosition(node, { x: element.x, y: element.y });
    setNodeZIndex(node, element.zIndex);
    node.setAttr(HOSTED_ELEMENT_ATTR, structuredClone(element));
    this.mountWidgetFromUpdate(node, element);
    this.syncMountedNode(node);
    this.syncDomOrder();
  }

  private setupNodeListeners(context: IPluginContext, node: Konva.Rect) {
    node.on("destroy", () => {
      this.unmountWidget(node.id());
    });

    node.on("dragmove transform", () => {
      this.syncMountedNode(node);
    });

    node.on("pointerclick", (event) => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERCLICK, event);
    });

    node.on("pointerdown", (event) => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDOWN, event);
      if (earlyExit) event.cancelBubble = true;
    });

    node.on("pointerdblclick", (event) => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      const earlyExit = context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERDBLCLICK, event);
      if (earlyExit) event.cancelBubble = true;
    });
  }

  private mountWidget(context: IPluginContext, node: Konva.Rect, element: THostedWidgetElement) {
    if (this.#mounts.has(node.id())) {
      this.mountWidgetFromUpdate(node, element);
      return;
    }

    const mountElement = document.createElement("div");
    mountElement.dataset.hostedWidgetId = node.id();
    mountElement.style.position = "absolute";
    mountElement.style.left = "0";
    mountElement.style.top = "0";
    mountElement.style.pointerEvents = "auto";
    context.worldWidgetsRoot.appendChild(mountElement);

    const [currentElement, setCurrentElement] = createSignal(element);
    const [beforeRemove, setBeforeRemove] = createSignal<(() => void | Promise<void>) | null>(null);
    const [autoSize, setAutoSize] = createSignal<((size: { width: number; height: number }) => void) | null>(null);
    const dispose = render(() => (
      <HostedWidgetShell
        element={currentElement}
        onSelectPointerDown={(event) => {
          this.selectHostedNode(context, node, event);
        }}
        onHeaderPointerDown={(event) => {
          this.beginDomDrag(context, node, event);
        }}
        onHeaderDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          this.showTransformerForNode(context, node);
        }}
        onRemove={() => {
          void this.removeHostedNode(context, node);
        }}
        onReload={() => {
          void this.reloadHostedNode(context, node);
        }}
      >
        <Show when={currentElement().data.type === "filetree"}>
          <FiletreeHostedWidget
            element={currentElement as () => THostedWidgetElementMap["filetree"]}
            canvasId={context.capabilities.filetree?.canvasId}
            safeClient={context.capabilities.filetree?.safeClient}
            registerBeforeRemove={(handler) => setBeforeRemove(() => handler)}
          />
        </Show>
        <Show when={currentElement().data.type === "file"}>
          <FileHostedWidget
            element={currentElement as () => THostedWidgetElementMap["file"]}
            safeClient={context.capabilities.file?.safeClient}
            requestInitialSize={(size) => autoSize()?.(size)}
          />
        </Show>
        <Show when={currentElement().data.type === "terminal"}>
          <TerminalHostedWidget
            element={currentElement as () => THostedWidgetElementMap["terminal"]}
            safeClient={context.capabilities.terminal?.safeClient}
            registerBeforeRemove={(handler) => setBeforeRemove(() => handler)}
          />
        </Show>
      </HostedWidgetShell>
    ), mountElement);

    this.#mounts.set(node.id(), {
      node,
      mountElement,
      dispose,
      setElement: (nextElement) => setCurrentElement(() => nextElement),
      beforeRemove: () => beforeRemove()?.(),
      setBeforeRemove: (handler) => setBeforeRemove(() => handler),
      setAutoSize: (handler) => setAutoSize(() => handler),
    });

    if (element.data.type === "file") {
      this.#mounts.get(node.id())?.setAutoSize((size) => {
        const snapshot = structuredClone(node.getAttr(HOSTED_ELEMENT_ATTR) as THostedWidgetElement | undefined);
        if (!snapshot || snapshot.data.type !== "file") return;
        if (snapshot.data.w !== 560 || snapshot.data.h !== 500) return;

        node.width(size.width);
        node.height(size.height);
        const nextElement = this.toElement(node);
        node.setAttr(HOSTED_ELEMENT_ATTR, structuredClone(nextElement));
        this.mountWidgetFromUpdate(node, nextElement);
        this.syncMountedNode(node);
        context.crdt.patch({ elements: [nextElement], groups: [] });
        context.stage.batchDraw();
      });
    }

    this.syncMountedNode(node);
    this.syncDomOrder();
  }

  private mountWidgetFromUpdate(node: Konva.Rect, element: THostedWidgetElement) {
    const mounted = this.#mounts.get(node.id());
    if (!mounted) return;
    mounted.setElement(element);
  }

  private unmountWidget(id: string) {
    const mounted = this.#mounts.get(id);
    if (!mounted) return;
    mounted.dispose();
    mounted.mountElement.remove();
    this.#mounts.delete(id);
  }

  private syncMountedNode(node: Konva.Rect) {
    const mounted = this.#mounts.get(node.id());
    if (!mounted) return;

    const bounds = getScreenBounds(node);
    mounted.mountElement.style.transform = `translate(${bounds.x}px, ${bounds.y}px) rotate(${bounds.rotation}deg) scale(${bounds.zoom})`;
    mounted.mountElement.style.transformOrigin = "top left";
    mounted.mountElement.style.width = `${Math.max(bounds.width, node.width())}px`;
    mounted.mountElement.style.height = `${Math.max(bounds.height, node.height())}px`;
  }

  private syncDomOrder() {
    const ordered = [...this.#mounts.values()].sort((a, b) => {
      return getOrderKey(a.node).localeCompare(getOrderKey(b.node));
    });

    ordered.forEach((entry) => {
      entry.mountElement.parentElement?.appendChild(entry.mountElement);
    });
  }

  private selectHostedNode(context: IPluginContext, node: Konva.Rect, event: PointerEvent | MouseEvent) {
    if (context.state.mode !== CanvasMode.SELECT) return;
    if (event.button !== 0) return;

    node.setAttr(HOSTED_TRANSFORMER_VISIBLE_ATTR, false);

    if (event.shiftKey) {
      const exists = context.state.selection.some((candidate) => candidate.id() === node.id());
      if (exists) {
        context.setState("selection", context.state.selection.filter((candidate) => candidate.id() !== node.id()));
      } else {
        context.setState("selection", [...context.state.selection, node]);
      }
      return;
    }

    if (context.state.selection.length === 1 && context.state.selection[0]?.id() === node.id()) return;
    context.setState("selection", [node]);
  }

  private showTransformerForNode(context: IPluginContext, node: Konva.Rect) {
    node.setAttr(HOSTED_TRANSFORMER_VISIBLE_ATTR, true);
    if (!(context.state.selection.length === 1 && context.state.selection[0]?.id() === node.id())) {
      context.setState("selection", [node]);
    } else {
      context.setState("selection", [...context.state.selection]);
    }
  }

  private async removeHostedNode(context: IPluginContext, node: Konva.Rect) {
    const mounted = this.#mounts.get(node.id());
    await mounted?.beforeRemove?.();
    context.setState("selection", context.state.selection.filter((candidate) => candidate.id() !== node.id()));
    context.crdt.deleteById({ elementIds: [node.id()], groupIds: [] });
    this.unmountWidget(node.id());
    node.destroy();
  }

  private async reloadHostedNode(context: IPluginContext, node: Konva.Rect) {
    const snapshot = structuredClone(node.getAttr(HOSTED_ELEMENT_ATTR) as THostedWidgetElement | undefined);
    if (!snapshot) return;

    this.unmountWidget(node.id());
    this.mountWidget(context, node, snapshot);
    this.syncMountedNode(node);
    this.syncDomOrder();
  }

  private beginDomDrag(context: IPluginContext, node: Konva.Rect, event: PointerEvent | MouseEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    this.selectHostedNode(context, node, event);
    this.#cleanupDrag?.();

    const activeSelection = TransformPlugin.filterSelection(
      context.state.selection.some((candidate) => candidate.id() === node.id())
        ? context.state.selection
        : [node],
    );

    const startPointerWorld = getPointerWorldPoint(context, { x: event.clientX, y: event.clientY });
    const pointerOffsets = new Map(activeSelection.map((candidate) => {
      const position = getWorldPosition(candidate);
      return [candidate.id(), {
        x: position.x - startPointerWorld.x,
        y: position.y - startPointerWorld.y,
      }];
    }));
    const beforeElements = collectSelectionShapes(context, activeSelection)
      .map((shape) => context.capabilities.toElement?.(shape))
      .filter((element): element is TElement => Boolean(element))
      .map((element) => structuredClone(element));
    const throttledPatch = throttle((elements: TElement[]) => {
      context.crdt.patch({ elements, groups: [] });
    }, 100);

    const onPointerMove = (moveEvent: PointerEvent | MouseEvent) => {
      const pointerWorld = getPointerWorldPoint(context, { x: moveEvent.clientX, y: moveEvent.clientY });

      activeSelection.forEach((candidate) => {
        const offset = pointerOffsets.get(candidate.id());
        if (!offset) return;
        setWorldPosition(candidate, {
          x: pointerWorld.x + offset.x,
          y: pointerWorld.y + offset.y,
        });
        if (candidate instanceof Konva.Rect && HostedSolidWidgetPlugin.isHostedNode(candidate)) {
          this.syncMountedNode(candidate);
        }
      });

      const liveElements = collectSelectionShapes(context, activeSelection)
        .map((shape) => context.capabilities.toElement?.(shape))
        .filter((element): element is TElement => Boolean(element))
        .map((element) => structuredClone(element));
      if (liveElements.length > 0) {
        throttledPatch(liveElements);
      }

      context.stage.batchDraw();
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove as EventListener);
      window.removeEventListener("pointerup", onPointerUp);
      this.#cleanupDrag = null;

      const afterElements = collectSelectionShapes(context, activeSelection)
        .map((shape) => context.capabilities.toElement?.(shape))
        .filter((element): element is TElement => Boolean(element))
        .map((element) => structuredClone(element));

      if (afterElements.length === 0) return;
      context.crdt.patch({ elements: afterElements, groups: [] });
      context.history.record({
        label: "drag-hosted-widget",
        undo: () => {
          beforeElements.forEach((element) => context.capabilities.updateShapeFromTElement?.(element));
          context.crdt.patch({ elements: beforeElements, groups: [] });
        },
        redo: () => {
          afterElements.forEach((element) => context.capabilities.updateShapeFromTElement?.(element));
          context.crdt.patch({ elements: afterElements, groups: [] });
        },
      });
    };

    window.addEventListener("pointermove", onPointerMove as EventListener);
    window.addEventListener("pointerup", onPointerUp, { once: true });
    this.#cleanupDrag = () => {
      window.removeEventListener("pointermove", onPointerMove as EventListener);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }

  private toElement(node: Konva.Rect): THostedWidgetElement {
    const snapshot = structuredClone(node.getAttr(HOSTED_ELEMENT_ATTR) as THostedWidgetElement | undefined);
    const widgetType = node.getAttr(HOSTED_TYPE_ATTR);
    const type = isHostedType(widgetType) ? widgetType : null;
    if (!snapshot || !type) {
      throw new Error("Missing hosted widget snapshot");
    }

    const worldPosition = getWorldPosition(node);
    const absoluteScale = node.getAbsoluteScale();
    const layer = node.getLayer();
    const layerScaleX = layer?.scaleX() ?? 1;
    const layerScaleY = layer?.scaleY() ?? 1;
    const parent = node.getParent();

    return {
      ...snapshot,
      x: worldPosition.x,
      y: worldPosition.y,
      rotation: node.getAbsoluteRotation(),
      parentGroupId: parent instanceof Konva.Group ? parent.id() : null,
      zIndex: getNodeZIndex(node),
      updatedAt: Date.now(),
      data: {
        ...snapshot.data,
        w: node.width() * (absoluteScale.x / layerScaleX),
        h: node.height() * (absoluteScale.y / layerScaleY),
      },
    } as THostedWidgetElement;
  }
}
