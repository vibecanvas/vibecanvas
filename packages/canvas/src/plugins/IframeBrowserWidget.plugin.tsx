import { throttle } from "@solid-primitives/scheduled";
import type { JSX } from "solid-js";
import { For, createEffect, createSignal, onCleanup } from "solid-js";
import { render } from "solid-js/web";
import type { TElement } from "@vibecanvas/shell/automerge/index";
import type { TIframeBrowserData, TIframeBrowserTab } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import FrameIcon from "lucide-solid/icons/frame";
import XIcon from "lucide-solid/icons/x";
import PlusIcon from "lucide-solid/icons/plus";
import ChevronLeftIcon from "lucide-solid/icons/chevron-left";
import ChevronRightIcon from "lucide-solid/icons/chevron-right";
import RefreshCwIcon from "lucide-solid/icons/refresh-cw";
import type { TTool } from "../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../custom-events";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import { getWorldPosition, setWorldPosition } from "./node-space";
import { scheduleHostedWidgetFocus } from "./hosted-widget-focus.shared";
import { getNodeZIndex, setNodeZIndex } from "./render-order.shared";
import { TransformPlugin } from "./Transform.plugin";

// Same string values as HostedSolidWidget — TransformPlugin checks these exact attribute names
const BROWSER_NODE_ATTR = "vcHostedWidget";
const BROWSER_TRANSFORMER_ATTR = "vcHostedTransformerVisible";
const BROWSER_TYPE_ATTR = "vcBrowserWidgetType";
const BROWSER_ELEMENT_ATTR = "vcBrowserElementSnapshot";
const BROWSER_WIDGET_CLASS = "vc-iframe-browser-widget";
const CONTENT_INSET = 14;
const HEADER_HEIGHT = 32; // tab bar row
const ADDRESS_BAR_HEIGHT = 32; // address bar row

type TBrowserElement = TElement & { data: TIframeBrowserData };

type TBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zoom: number;
};

type TBrowserMountRecord = {
  node: Konva.Rect;
  mountElement: HTMLDivElement;
  dispose: () => void;
  setElement: (el: TBrowserElement) => void;
};

// ── Utilities ────────────────────────────────────────────────────────────────

function normalizeUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^(https?|about|data|blob):/.test(s)) return s;
  return `https://${s}`;
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

function collectSelectionShapes(roots: Array<Konva.Group | Konva.Shape>) {
  const shapes: Konva.Shape[] = [];
  const seen = new Set<string>();
  const visit = (node: Konva.Group | Konva.Shape) => {
    if (seen.has(node.id())) return;
    seen.add(node.id());
    if (node instanceof Konva.Group) {
      node.getChildren().forEach((child) => {
        if (child instanceof Konva.Group || child instanceof Konva.Shape) visit(child);
      });
      return;
    }
    shapes.push(node);
  };
  roots.forEach(visit);
  return shapes;
}

function getDefaultBrowserElement(x: number, y: number): TBrowserElement {
  const tabId = crypto.randomUUID();
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
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
      backgroundColor: "#ffffff",
      borderColor: "#d1d5db",
      headerColor: "#f3f4f6",
      opacity: 1,
    },
    data: {
      type: "iframe-browser",
      w: 800,
      h: 560,
      isCollapsed: false,
      tabs: [{ id: tabId, url: "", title: "New Tab" }],
      activeTabId: tabId,
    } satisfies TIframeBrowserData,
  };
}

// ── Browser Chrome Component ─────────────────────────────────────────────────

function BrowserChrome(props: {
  element: () => TBrowserElement;
  isFocused: () => boolean;
  isInteractive: () => boolean;
  onHeaderPointerDown: (event: PointerEvent | MouseEvent) => void;
  onHeaderDoubleClick: (event: MouseEvent) => void;
  onSelectPointerDown: (event: PointerEvent | MouseEvent) => void;
  onRemove: () => void;
  onTabAdd: () => void;
  onTabClose: (tabId: string) => void;
  onTabActivate: (tabId: string) => void;
  onNavigate: (url: string) => void;
  onTitleUpdate: (tabId: string, title: string) => void;
}): JSX.Element {
  // Kept outside reactive system — imperative iframe lifecycle (see createEffect below)
  const iframeRefs = new Map<string, HTMLIFrameElement>();
  let iframeContainerRef: HTMLDivElement | undefined;

  const activeTab = () => {
    const el = props.element();
    return el.data.tabs.find((t) => t.id === el.data.activeTabId) ?? el.data.tabs[0];
  };

  const activeTabUrl = () => activeTab()?.url ?? "";

  const [inputValue, setInputValue] = createSignal(activeTabUrl());
  const [addressBarFocused, setAddressBarFocused] = createSignal(false);

  // Sync address bar to active tab URL when not focused
  createEffect(() => {
    const url = activeTabUrl();
    if (!addressBarFocused()) {
      setInputValue(url);
    }
  });

  // Manage iframes imperatively so that tab switches / tab mutations never destroy
  // existing iframes and lose their navigation state. SolidJS <For> diffs by reference
  // equality — since tab objects are always new references after any mutation, using
  // <For> here would recreate every iframe on every state change.
  createEffect(() => {
    if (!iframeContainerRef) return;
    const tabs = props.element().data.tabs;
    const activeTabId = props.element().data.activeTabId;

    // Create iframes for tabs that don't have one yet
    for (const tab of tabs) {
      if (!iframeRefs.has(tab.id)) {
        const iframe = document.createElement("iframe");
        iframe.setAttribute(
          "sandbox",
          "allow-scripts allow-same-origin allow-forms allow-popups allow-presentation",
        );
        iframe.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:none;display:none;";
        iframe.addEventListener("load", () => handleIframeLoad(tab.id));
        iframeContainerRef.appendChild(iframe);
        iframeRefs.set(tab.id, iframe);
        // Set src after appending so load fires correctly
        iframe.src = tab.url ? normalizeUrl(tab.url) : "about:blank";
      }
    }

    // Update visibility and remove iframes for closed tabs
    const currentTabIds = new Set(tabs.map((t) => t.id));
    for (const [tabId, iframe] of [...iframeRefs]) {
      if (!currentTabIds.has(tabId)) {
        iframe.remove();
        iframeRefs.delete(tabId);
      } else {
        iframe.style.display = tabId === activeTabId ? "block" : "none";
      }
    }
  });

  const handleNavigateSubmit = () => {
    const url = inputValue().trim();
    const normalized = normalizeUrl(url);
    setInputValue(normalized);
    // Imperatively update the active iframe src
    const tabId = activeTab()?.id;
    if (tabId) {
      const ref = iframeRefs.get(tabId);
      if (ref) ref.src = normalized || "about:blank";
    }
    props.onNavigate(normalized);
  };

  const handleBack = () => {
    const ref = iframeRefs.get(activeTab()?.id ?? "");
    if (!ref) return;
    try { ref.contentWindow?.history.back(); } catch { /* cross-origin */ }
  };

  const handleForward = () => {
    const ref = iframeRefs.get(activeTab()?.id ?? "");
    if (!ref) return;
    try { ref.contentWindow?.history.forward(); } catch { /* cross-origin */ }
  };

  const handleReload = () => {
    const ref = iframeRefs.get(activeTab()?.id ?? "");
    if (!ref) return;
    ref.src = ref.src; // force reload, works cross-origin
  };

  const handleIframeLoad = (tabId: string) => {
    const ref = iframeRefs.get(tabId);
    if (!ref) return;
    try {
      const title = ref.contentDocument?.title;
      if (title) props.onTitleUpdate(tabId, title);
      const href = ref.contentWindow?.location.href;
      if (href && href !== "about:blank" && tabId === activeTab()?.id) {
        setInputValue(href);
      }
    } catch { /* cross-origin: silently ignore */ }
  };

  const borderColor = () => props.element().style.borderColor ?? "#d1d5db";
  const focusBorderColor = () => "#2563eb";
  const resolvedBorderColor = () => props.isFocused() ? focusBorderColor() : borderColor();
  const headerBg = () => props.element().style.headerColor ?? "#f3f4f6";
  const boxShadow = () => props.isFocused()
    ? `0 0 0 1px ${focusBorderColor()}, 0 12px 30px rgba(15,23,42,0.18)`
    : "0 8px 24px rgba(15,23,42,0.12)";

  return (
    <div
      data-hosted-widget-root="true"
      data-hosted-widget-focus-root="true"
      data-hosted-widget-focused={props.isFocused() ? "true" : "false"}
      data-hosted-widget-interactive={props.isInteractive() ? "true" : "false"}
      tabIndex={-1}
      style={{
        position: "absolute",
        inset: `${CONTENT_INSET}px`,
        display: "flex",
        "flex-direction": "column",
        "pointer-events": props.isInteractive() ? "auto" : "none",
        border: `1px solid ${resolvedBorderColor()}`,
        background: props.element().style.backgroundColor ?? "#ffffff",
        "box-shadow": boxShadow(),
        overflow: "hidden",
        "font-family": "ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
      onPointerDown={(event) => props.onSelectPointerDown(event)}
    >
      {/* Tab bar row — drag handle */}
      <div
        data-hosted-widget-header="true"
        style={{
          display: "flex",
          "align-items": "center",
          "justify-content": "space-between",
          gap: "4px",
          padding: "0 6px",
          height: `${HEADER_HEIGHT}px`,
          background: headerBg(),
          "border-bottom": `1px solid ${resolvedBorderColor()}`,
          cursor: "grab",
          "user-select": "none",
          "flex-shrink": "0",
        }}
        onPointerDown={(event) => props.onHeaderPointerDown(event)}
        onDblClick={(event) => props.onHeaderDoubleClick(event)}
      >
        {/* Tabs */}
        <div style={{ display: "flex", "align-items": "center", gap: "2px", flex: "1", overflow: "hidden", "min-width": "0" }}>
          <For each={props.element().data.tabs}>
            {(tab) => {
              const isActive = () => tab.id === props.element().data.activeTabId;
              return (
                <div
                  style={{
                    display: "flex",
                    "align-items": "center",
                    gap: "4px",
                     padding: "2px 8px 2px 10px",
                     height: "26px",
                     background: isActive() ? (props.element().style.backgroundColor ?? "#ffffff") : "transparent",
                     border: isActive() ? `1px solid ${resolvedBorderColor()}` : "1px solid transparent",
                     "border-bottom": isActive() ? `1px solid ${props.element().style.backgroundColor ?? "#ffffff"}` : "1px solid transparent",
                     "border-radius": "6px 6px 0 0",
                     "max-width": "160px",
                    cursor: "pointer",
                    "flex-shrink": "0",
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    props.onTabActivate(tab.id);
                  }}
                >
                  <span style={{ "font-size": "11px", color: "#374151", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap", "max-width": "110px" }}>
                    {tab.title || "New Tab"}
                  </span>
                  <button
                    type="button"
                    aria-label="Close tab"
                    disabled={props.element().data.tabs.length <= 1}
                    style={{
                      display: "inline-flex",
                      "align-items": "center",
                      "justify-content": "center",
                      width: "14px",
                      height: "14px",
                      border: "none",
                      background: "transparent",
                      color: "#9ca3af",
                      cursor: props.element().data.tabs.length <= 1 ? "not-allowed" : "pointer",
                      opacity: props.element().data.tabs.length <= 1 ? "0.3" : "1",
                      padding: "0",
                      "flex-shrink": "0",
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onTabClose(tab.id);
                    }}
                  >
                    <XIcon size={10} />
                  </button>
                </div>
              );
            }}
          </For>
          {/* New tab button */}
          <button
            type="button"
            aria-label="New tab"
            style={{
              display: "inline-flex",
              "align-items": "center",
              "justify-content": "center",
              width: "22px",
              height: "22px",
              border: "none",
              background: "transparent",
              color: "#6b7280",
              cursor: "pointer",
              "border-radius": "4px",
              "flex-shrink": "0",
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              props.onTabAdd();
            }}
          >
            <PlusIcon size={12} />
          </button>
        </div>

        {/* Widget controls */}
        <div style={{ display: "flex", "align-items": "center", gap: "4px", "flex-shrink": "0" }}>
          <button
            type="button"
            aria-label="Show resize handles"
            title="Resize"
            style={{
              display: "inline-flex",
              "align-items": "center",
              "justify-content": "center",
              width: "22px",
              height: "22px",
              border: `1px solid ${resolvedBorderColor()}`,
              background: "#ffffff",
              color: "#374151",
              cursor: "pointer",
              "border-radius": "3px",
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              props.onHeaderDoubleClick(event as unknown as MouseEvent);
            }}
          >
            <FrameIcon size={11} />
          </button>
          <button
            type="button"
            aria-label="Close widget"
            title="Close"
            style={{
              display: "inline-flex",
              "align-items": "center",
              "justify-content": "center",
              width: "22px",
              height: "22px",
              border: `1px solid ${resolvedBorderColor()}`,
              background: "#ffffff",
              color: "#374151",
              cursor: "pointer",
              "border-radius": "3px",
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              props.onRemove();
            }}
          >
            <XIcon size={12} />
          </button>
        </div>
      </div>

      {/* Address bar row — NOT a drag handle */}
      <div
        style={{
          display: "flex",
          "align-items": "center",
          gap: "4px",
          padding: "0 8px",
          height: `${ADDRESS_BAR_HEIGHT}px`,
          background: "#f9fafb",
          "border-bottom": `1px solid ${resolvedBorderColor()}`,
          "flex-shrink": "0",
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Go back"
          style={navBtnStyle()}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => { event.stopPropagation(); handleBack(); }}
        >
          <ChevronLeftIcon size={13} />
        </button>
        <button
          type="button"
          aria-label="Go forward"
          style={navBtnStyle()}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => { event.stopPropagation(); handleForward(); }}
        >
          <ChevronRightIcon size={13} />
        </button>
        <button
          type="button"
          aria-label="Reload"
          style={navBtnStyle()}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => { event.stopPropagation(); handleReload(); }}
        >
          <RefreshCwIcon size={12} />
        </button>
        <input
          type="text"
          value={inputValue()}
          placeholder="Enter URL"
          style={{
            flex: "1",
             height: "22px",
             padding: "0 8px",
             border: `1px solid ${resolvedBorderColor()}`,
             "border-radius": "11px",
             "font-size": "11px",
             color: "#374151",
            background: "#ffffff",
            outline: "none",
            "font-family": "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
          onInput={(event) => setInputValue(event.currentTarget.value)}
          onFocus={(event) => {
            event.stopPropagation();
            setAddressBarFocused(true);
            event.currentTarget.select();
          }}
          onBlur={() => setAddressBarFocused(false)}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") handleNavigateSubmit();
          }}
        />
      </div>

      {/* Content area — iframes are managed imperatively in the createEffect above */}
      <div
        ref={iframeContainerRef}
        style={{ flex: "1", position: "relative", overflow: "hidden" }}
      />
    </div>
  );
}

function navBtnStyle(): JSX.CSSProperties {
  return {
    display: "inline-flex",
    "align-items": "center",
    "justify-content": "center",
    width: "22px",
    height: "22px",
    border: "none",
    background: "transparent",
    color: "#6b7280",
    cursor: "pointer",
    "border-radius": "4px",
    "flex-shrink": "0",
  };
}

// ── Plugin ───────────────────────────────────────────────────────────────────

export class IframeBrowserWidgetPlugin implements IPlugin {
  #activeTool: TTool = "select";
  #mounts = new Map<string, TBrowserMountRecord>();
  #cleanupDrag: (() => void) | null = null;

  apply(context: IPluginContext): void {
    this.#setupCapabilities(context);
    this.#setupToolState(context);
    this.#setupClickCreate(context);

    context.hooks.cameraChange.tap(() => {
      this.#mounts.forEach(({ node }) => this.#syncMountedNode(node));
    });

    context.hooks.destroy.tap(() => {
      this.#cleanupDrag?.();
      this.#cleanupDrag = null;
      [...this.#mounts.keys()].forEach((id) => this.#unmountWidget(id));
    });
  }

  static isBrowserNode(node: Konva.Node | null | undefined): node is Konva.Rect {
    return (
      node instanceof Konva.Rect &&
      node.getAttr(BROWSER_NODE_ATTR) === true &&
      node.getAttr(BROWSER_TYPE_ATTR) === "iframe-browser"
    );
  }

  #setupToolState(context: IPluginContext) {
    context.hooks.customEvent.tap((event, payload) => {
      if (event !== CustomEvents.TOOL_SELECT) return false;
      this.#activeTool = payload as TTool;
      return false;
    });
  }

  #setupClickCreate(context: IPluginContext) {
    context.hooks.pointerUp.tap(() => {
      if (context.state.mode !== CanvasMode.CLICK_CREATE) return;
      if (this.#activeTool !== "browser") return;

      const pointer = context.staticForegroundLayer.getRelativePointerPosition();
      if (!pointer) return;

      const element = getDefaultBrowserElement(pointer.x, pointer.y);
      const node = this.#createBrowserNode(context, element);
      context.staticForegroundLayer.add(node);
      context.capabilities.renderOrder?.assignOrderOnInsert({
        parent: context.staticForegroundLayer,
        nodes: [node],
        position: "front",
      });
      context.crdt.patch({ elements: [this.#toElement(node)], groups: [] });
      context.setState("selection", [node]);
      context.setState("focusedId", node.id());
      context.setState("mode", CanvasMode.SELECT);
      context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "select");
    });
  }

  #setupCapabilities(context: IPluginContext) {
    const prevCreate = context.capabilities.createShapeFromTElement;
    context.capabilities.createShapeFromTElement = (element) => {
      if (element.data.type !== "iframe-browser") return prevCreate?.(element) ?? null;
      return this.#createBrowserNode(context, element as TBrowserElement);
    };

    const prevUpdate = context.capabilities.updateShapeFromTElement;
    context.capabilities.updateShapeFromTElement = (element) => {
      if (element.data.type !== "iframe-browser") return prevUpdate?.(element) ?? null;
      const node = context.staticForegroundLayer.findOne(
        (candidate: Konva.Node) => candidate.id() === element.id,
      );
      if (!IframeBrowserWidgetPlugin.isBrowserNode(node)) return null;
      this.#updateBrowserNode(node, element as TBrowserElement);
      return node;
    };

    const prevToElement = context.capabilities.toElement;
    context.capabilities.toElement = (node) => {
      if (IframeBrowserWidgetPlugin.isBrowserNode(node)) return this.#toElement(node);
      return prevToElement?.(node) ?? null;
    };
  }

  #createBrowserNode(context: IPluginContext, element: TBrowserElement): Konva.Rect {
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

    node.name(BROWSER_WIDGET_CLASS);
    node.setAttr(BROWSER_NODE_ATTR, true);
    node.setAttr(BROWSER_TYPE_ATTR, "iframe-browser");
    node.setAttr(BROWSER_ELEMENT_ATTR, structuredClone(element));
    node.setAttr(BROWSER_TRANSFORMER_ATTR, false);
    setNodeZIndex(node, element.zIndex);

    this.#setupNodeListeners(context, node);
    this.#mountWidget(context, node, element);

    queueMicrotask(() => {
      if (!this.#mounts.has(node.id())) return;
      this.#syncMountedNode(node);
      this.#syncDomOrder();
    });

    return node;
  }

  #updateBrowserNode(node: Konva.Rect, element: TBrowserElement) {
    node.width(element.data.w);
    node.height(element.data.h);
    node.rotation(element.rotation);
    node.scale({ x: 1, y: 1 });
    node.skew({ x: 0, y: 0 });
    setWorldPosition(node, { x: element.x, y: element.y });
    setNodeZIndex(node, element.zIndex);
    node.setAttr(BROWSER_ELEMENT_ATTR, structuredClone(element));
    this.#mountWidgetFromUpdate(node, element);
    this.#syncMountedNode(node);
    this.#syncDomOrder();
  }

  #setupNodeListeners(context: IPluginContext, node: Konva.Rect) {
    node.on("destroy", () => {
      this.#unmountWidget(node.id());
    });

    node.on("dragmove transform", () => {
      this.#syncMountedNode(node);
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

  #mountWidget(context: IPluginContext, node: Konva.Rect, element: TBrowserElement) {
    if (this.#mounts.has(node.id())) {
      this.#mountWidgetFromUpdate(node, element);
      return;
    }

    const mountElement = document.createElement("div");
    mountElement.dataset.iframeBrowserWidgetId = node.id();
    mountElement.style.position = "absolute";
    mountElement.style.left = "0";
    mountElement.style.top = "0";
    mountElement.style.pointerEvents = "none";
    context.worldWidgetsRoot.appendChild(mountElement);

    const [currentElement, setCurrentElement] = createSignal<TBrowserElement>(element);

    const updateElement = (nextElement: TBrowserElement) => {
      setCurrentElement(() => nextElement);
      node.setAttr(BROWSER_ELEMENT_ATTR, structuredClone(nextElement));
      context.crdt.patch({ elements: [this.#toElement(node)], groups: [] });
    };

    const handleTabAdd = () => {
      const current = currentElement();
      const newTab: TIframeBrowserTab = { id: crypto.randomUUID(), url: "", title: "New Tab" };
      updateElement({
        ...current,
        updatedAt: Date.now(),
        data: { ...current.data, tabs: [...current.data.tabs, newTab], activeTabId: newTab.id },
      });
    };

    const handleTabClose = (tabId: string) => {
      const current = currentElement();
      if (current.data.tabs.length <= 1) return;
      const nextTabs = current.data.tabs.filter((t) => t.id !== tabId);
      const nextActiveId =
        current.data.activeTabId === tabId
          ? (nextTabs[nextTabs.length - 1]?.id ?? nextTabs[0]?.id ?? "")
          : current.data.activeTabId;
      updateElement({
        ...current,
        updatedAt: Date.now(),
        data: { ...current.data, tabs: nextTabs, activeTabId: nextActiveId },
      });
    };

    const handleTabActivate = (tabId: string) => {
      const current = currentElement();
      if (current.data.activeTabId === tabId) return;
      updateElement({
        ...current,
        updatedAt: Date.now(),
        data: { ...current.data, activeTabId: tabId },
      });
    };

    const handleNavigate = (url: string) => {
      const current = currentElement();
      const normalized = normalizeUrl(url);
      const nextTabs = current.data.tabs.map((t) =>
        t.id === current.data.activeTabId ? { ...t, url: normalized } : t,
      );
      updateElement({
        ...current,
        updatedAt: Date.now(),
        data: { ...current.data, tabs: nextTabs },
      });
    };

    const handleTitleUpdate = (tabId: string, title: string) => {
      const current = currentElement();
      const tab = current.data.tabs.find((t) => t.id === tabId);
      if (!tab || tab.title === title) return;
      const nextTabs = current.data.tabs.map((t) => (t.id === tabId ? { ...t, title } : t));
      // Title updates are cosmetic — update signal only, no CRDT write
      setCurrentElement(() => ({ ...current, data: { ...current.data, tabs: nextTabs } }));
    };

    const dispose = render(() => {
      createEffect(() => {
        const interactive = context.state.focusedId === node.id() && context.state.mode === CanvasMode.SELECT;
        mountElement.style.pointerEvents = interactive ? "auto" : "none";
        mountElement.dataset.hostedWidgetInteractive = interactive ? "true" : "false";

        if (!interactive) return;
        const cleanupFocus = scheduleHostedWidgetFocus(mountElement);
        onCleanup(cleanupFocus);
      });

      return (
        <BrowserChrome
          element={currentElement}
          isFocused={() => context.state.focusedId === node.id()}
          isInteractive={() => context.state.focusedId === node.id() && context.state.mode === CanvasMode.SELECT}
          onSelectPointerDown={(event) => this.#selectBrowserNode(context, node, event)}
          onHeaderPointerDown={(event) => this.#beginDomDrag(context, node, event)}
          onHeaderDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            this.#showTransformerForNode(context, node);
          }}
          onRemove={() => this.#removeBrowserNode(context, node)}
          onTabAdd={handleTabAdd}
          onTabClose={handleTabClose}
          onTabActivate={handleTabActivate}
          onNavigate={handleNavigate}
          onTitleUpdate={handleTitleUpdate}
        />
      );
    }, mountElement);

    this.#mounts.set(node.id(), {
      node,
      mountElement,
      dispose,
      setElement: (nextElement) => setCurrentElement(() => nextElement),
    });

    this.#syncMountedNode(node);
    this.#syncDomOrder();
  }

  #mountWidgetFromUpdate(node: Konva.Rect, element: TBrowserElement) {
    const mounted = this.#mounts.get(node.id());
    if (!mounted) return;
    mounted.setElement(element);
  }

  #unmountWidget(id: string) {
    const mounted = this.#mounts.get(id);
    if (!mounted) return;
    mounted.dispose();
    mounted.mountElement.remove();
    this.#mounts.delete(id);
  }

  #syncMountedNode(node: Konva.Rect) {
    const mounted = this.#mounts.get(node.id());
    if (!mounted) return;
    const bounds = getScreenBounds(node);
    mounted.mountElement.style.transform = `translate(${bounds.x}px, ${bounds.y}px) rotate(${bounds.rotation}deg) scale(${bounds.zoom})`;
    mounted.mountElement.style.transformOrigin = "top left";
    mounted.mountElement.style.width = `${Math.max(bounds.width, CONTENT_INSET * 2 + 24)}px`;
    mounted.mountElement.style.height = `${Math.max(bounds.height, CONTENT_INSET * 2 + 24)}px`;
  }

  #syncDomOrder() {
    const ordered = [...this.#mounts.values()].sort((a, b) =>
      getOrderKey(a.node).localeCompare(getOrderKey(b.node)),
    );
    ordered.forEach((entry) => {
      entry.mountElement.parentElement?.appendChild(entry.mountElement);
    });
  }

  #selectBrowserNode(context: IPluginContext, node: Konva.Rect, event: PointerEvent | MouseEvent) {
    if (context.state.mode !== CanvasMode.SELECT) return;
    if (event.button !== 0) return;

    node.setAttr(BROWSER_TRANSFORMER_ATTR, false);

    if (event.shiftKey) {
      const exists = context.state.selection.some((c) => c.id() === node.id());
      if (exists) {
        context.setState("selection", context.state.selection.filter((c) => c.id() !== node.id()));
        if (context.state.focusedId === node.id()) {
          context.setState("focusedId", null);
        }
      } else {
        context.setState("selection", [...context.state.selection, node]);
        context.setState("focusedId", node.id());
      }
      return;
    }

    context.setState("focusedId", node.id());
    if (context.state.selection.length === 1 && context.state.selection[0]?.id() === node.id()) return;
    context.setState("selection", [node]);
  }

  #showTransformerForNode(context: IPluginContext, node: Konva.Rect) {
    node.setAttr(BROWSER_TRANSFORMER_ATTR, true);
    context.setState("focusedId", node.id());
    if (!(context.state.selection.length === 1 && context.state.selection[0]?.id() === node.id())) {
      context.setState("selection", [node]);
    } else {
      context.setState("selection", [...context.state.selection]);
    }
  }

  #removeBrowserNode(context: IPluginContext, node: Konva.Rect) {
    context.setState("selection", context.state.selection.filter((c) => c.id() !== node.id()));
    if (context.state.focusedId === node.id()) {
      context.setState("focusedId", null);
    }
    context.crdt.deleteById({ elementIds: [node.id()], groupIds: [] });
    this.#unmountWidget(node.id());
    node.destroy();
  }

  #beginDomDrag(context: IPluginContext, node: Konva.Rect, event: PointerEvent | MouseEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    this.#selectBrowserNode(context, node, event);
    this.#cleanupDrag?.();

    const activeSelection = TransformPlugin.filterSelection(
      context.state.selection.some((c) => c.id() === node.id())
        ? context.state.selection
        : [node],
    );

    const startPointerWorld = getPointerWorldPoint(context, { x: event.clientX, y: event.clientY });
    const pointerOffsets = new Map(
      activeSelection.map((candidate) => {
        const position = getWorldPosition(candidate);
        return [
          candidate.id(),
          { x: position.x - startPointerWorld.x, y: position.y - startPointerWorld.y },
        ];
      }),
    );

    const beforeElements = collectSelectionShapes(activeSelection)
      .map((shape) => context.capabilities.toElement?.(shape))
      .filter((el): el is TElement => Boolean(el))
      .map((el) => structuredClone(el));

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
        if (IframeBrowserWidgetPlugin.isBrowserNode(candidate)) {
          this.#syncMountedNode(candidate);
        }
      });

      const liveElements = collectSelectionShapes(activeSelection)
        .map((shape) => context.capabilities.toElement?.(shape))
        .filter((el): el is TElement => Boolean(el))
        .map((el) => structuredClone(el));
      if (liveElements.length > 0) throttledPatch(liveElements);

      context.stage.batchDraw();
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove as EventListener);
      window.removeEventListener("pointerup", onPointerUp);
      this.#cleanupDrag = null;

      const afterElements = collectSelectionShapes(activeSelection)
        .map((shape) => context.capabilities.toElement?.(shape))
        .filter((el): el is TElement => Boolean(el))
        .map((el) => structuredClone(el));

      if (afterElements.length === 0) return;
      context.crdt.patch({ elements: afterElements, groups: [] });
      context.history.record({
        label: "drag-browser-widget",
        undo: () => {
          beforeElements.forEach((el) => context.capabilities.updateShapeFromTElement?.(el));
          context.crdt.patch({ elements: beforeElements, groups: [] });
        },
        redo: () => {
          afterElements.forEach((el) => context.capabilities.updateShapeFromTElement?.(el));
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

  #toElement(node: Konva.Rect): TBrowserElement {
    const snapshot = structuredClone(
      node.getAttr(BROWSER_ELEMENT_ATTR) as TBrowserElement | undefined,
    );
    if (!snapshot) throw new Error("Missing browser widget snapshot");

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
    };
  }
}
