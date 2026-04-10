import { createEffect, createSignal, onCleanup } from "solid-js";
import { render } from "solid-js/web";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc";
import Konva from "konva";
import type { TTool } from "../../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../../custom-events";
import { CanvasMode } from "../../services/canvas/enum";
import type { IPlugin, IPluginContext } from "../shared/interface";
import { setWorldPosition } from "../shared/node-space";
import { scheduleHostedWidgetFocus } from "../shared/hosted-widget-focus.shared";
import { setNodeZIndex } from "../shared/render-order.shared";
import {
  getHostedWidgetOrderKey,
  getHostedWidgetScreenBounds,
  HOSTED_WIDGET_NODE_ATTR,
  HOSTED_WIDGET_TRANSFORMER_VISIBLE_ATTR,
} from "../shared/hosted-widget.shared";
import { BrowserChrome } from "./IframeBrowserWidget.chrome";
import {
  BROWSER_ELEMENT_ATTR,
  BROWSER_TYPE_ATTR,
  BROWSER_WIDGET_CLASS,
  CONTENT_INSET,
} from "./IframeBrowserWidget.constants";
import { beginDomDrag } from "./IframeBrowserWidget.drag";
import {
  activateBrowserTab,
  addTabToBrowserElement,
  closeTabOnBrowserElement,
  getDefaultBrowserElement,
  isBrowserNode,
  navigateBrowserTab,
  toElement,
  updateBrowserTabTitle,
} from "./IframeBrowserWidget.helpers";
import type { TBrowserElement, TBrowserMountRecord } from "./IframeBrowserWidget.types";

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
    return isBrowserNode(node);
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
    node.setAttr(HOSTED_WIDGET_NODE_ATTR, true);
    node.setAttr(BROWSER_TYPE_ATTR, "iframe-browser");
    node.setAttr(BROWSER_ELEMENT_ATTR, structuredClone(element));
    node.setAttr(HOSTED_WIDGET_TRANSFORMER_VISIBLE_ATTR, false);
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
    let originalElement: TElement | null = null;

    node.on("destroy", () => {
      this.#unmountWidget(node.id());
    });

    node.on("dragstart", () => {
      originalElement = structuredClone(this.#toElement(node));
    });

    node.on("dragmove transform", () => {
      this.#syncMountedNode(node);
    });

    node.on("dragend", () => {
      const beforeElement = originalElement ? structuredClone(originalElement) : null;
      const afterElement = structuredClone(this.#toElement(node));
      originalElement = null;

      context.crdt.patch({ elements: [afterElement], groups: [] });
      if (!beforeElement) return;

      const didMove = beforeElement.x !== afterElement.x || beforeElement.y !== afterElement.y;
      if (!didMove) return;

      context.history.record({
        label: "drag-browser-widget",
        undo: () => {
          context.capabilities.updateShapeFromTElement?.(beforeElement);
          context.crdt.patch({ elements: [beforeElement], groups: [] });
        },
        redo: () => {
          context.capabilities.updateShapeFromTElement?.(afterElement);
          context.crdt.patch({ elements: [afterElement], groups: [] });
        },
      });
    });

    node.on("pointerclick", (event) => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERCLICK, event);
    });

    node.on("pointerdown", (event) => {
      if (context.state.mode !== CanvasMode.SELECT) return;
      if (context.state.focusedId !== node.id()) {
        this.#mounts.get(node.id())?.setPendingInteraction(true);
      }
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
    const [pendingInteraction, setPendingInteraction] = createSignal(false);

    const updateElement = (nextElement: TBrowserElement) => {
      setCurrentElement(() => nextElement);
      node.setAttr(BROWSER_ELEMENT_ATTR, structuredClone(nextElement));
      context.crdt.patch({ elements: [this.#toElement(node)], groups: [] });
    };

    const handleTabAdd = () => updateElement(addTabToBrowserElement(currentElement()));
    const handleTabClose = (tabId: string) => updateElement(closeTabOnBrowserElement(currentElement(), tabId));
    const handleTabActivate = (tabId: string) => updateElement(activateBrowserTab(currentElement(), tabId));
    const handleNavigate = (url: string) => updateElement(navigateBrowserTab(currentElement(), url));
    const handleTitleUpdate = (tabId: string, title: string) => {
      setCurrentElement((current) => updateBrowserTabTitle(current, tabId, title));
    };

    const clearPendingInteraction = () => {
      setPendingInteraction(false);
    };

    window.addEventListener("pointerup", clearPendingInteraction);
    window.addEventListener("pointercancel", clearPendingInteraction);
    window.addEventListener("blur", clearPendingInteraction);

    const dispose = render(() => {
      createEffect(() => {
        const transformerVisible =
          context.state.selection.some((candidate) => candidate.id() === node.id())
          && node.getAttr(HOSTED_WIDGET_TRANSFORMER_VISIBLE_ATTR) === true;
        const interactive = context.state.focusedId === node.id() && context.state.mode === CanvasMode.SELECT && !transformerVisible && !pendingInteraction();
        mountElement.style.pointerEvents = interactive ? "auto" : "none";
        mountElement.dataset.hostedWidgetInteractive = interactive ? "true" : "false";
        mountElement.toggleAttribute("inert", !interactive);

        if (!interactive) return;
        const cleanupFocus = scheduleHostedWidgetFocus(mountElement);
        onCleanup(cleanupFocus);
      });

      return (
        <BrowserChrome
          element={currentElement}
          isFocused={() => context.state.focusedId === node.id()}
          isInteractive={() => {
            const transformerVisible =
              context.state.selection.some((candidate) => candidate.id() === node.id())
              && node.getAttr(HOSTED_WIDGET_TRANSFORMER_VISIBLE_ATTR) === true;
            return context.state.focusedId === node.id() && context.state.mode === CanvasMode.SELECT && !transformerVisible && !pendingInteraction();
          }}
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
      dispose: () => {
        window.removeEventListener("pointerup", clearPendingInteraction);
        window.removeEventListener("pointercancel", clearPendingInteraction);
        window.removeEventListener("blur", clearPendingInteraction);
        dispose();
      },
      setElement: (nextElement) => setCurrentElement(nextElement),
      setPendingInteraction: (pending) => setPendingInteraction(pending),
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
    const bounds = getHostedWidgetScreenBounds(node);
    mounted.mountElement.style.transform = `translate(${bounds.x}px, ${bounds.y}px) rotate(${bounds.rotation}deg) scale(${bounds.zoom})`;
    mounted.mountElement.style.transformOrigin = "top left";
    mounted.mountElement.style.width = `${Math.max(bounds.width, CONTENT_INSET * 2 + 24)}px`;
    mounted.mountElement.style.height = `${Math.max(bounds.height, CONTENT_INSET * 2 + 24)}px`;
  }

  #syncDomOrder() {
    const ordered = [...this.#mounts.values()].sort((a, b) =>
      getHostedWidgetOrderKey(a.node).localeCompare(getHostedWidgetOrderKey(b.node)),
    );
    ordered.forEach((entry) => {
      entry.mountElement.parentElement?.appendChild(entry.mountElement);
    });
  }

  #selectBrowserNode(context: IPluginContext, node: Konva.Rect, event: PointerEvent | MouseEvent) {
    if (context.state.mode !== CanvasMode.SELECT) return;
    if (event.button !== 0) return;

    node.setAttr(HOSTED_WIDGET_TRANSFORMER_VISIBLE_ATTR, false);

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
    node.setAttr(HOSTED_WIDGET_TRANSFORMER_VISIBLE_ATTR, true);
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
    beginDomDrag({
      cleanupDrag: () => this.#cleanupDrag?.(),
      setCleanupDrag: (cleanup) => {
        this.#cleanupDrag = cleanup;
      },
      context,
      node,
      selectNode: (innerContext, innerNode, innerEvent) => this.#selectBrowserNode(innerContext, innerNode, innerEvent),
      isBrowserNode: IframeBrowserWidgetPlugin.isBrowserNode,
      syncMountedNode: (innerNode) => this.#syncMountedNode(innerNode),
    }, event);
  }

  #toElement(node: Konva.Rect): TBrowserElement {
    return toElement(node);
  }
}
