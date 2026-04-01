import type { TElement } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import type { TTool } from "../../components/FloatingCanvasToolbar/toolbar.types";
import { CustomEvents } from "../../custom-events";
import { CanvasMode } from "../../services/canvas/enum";
import { type IPlugin, type IPluginContext } from "../shared/interface";
import {
  getHostedWidgetOrderKey,
  getHostedWidgetScreenBounds,
  HOSTED_WIDGET_TRANSFORMER_VISIBLE_ATTR,
} from "../shared/hosted-widget.shared";
import { TransformPlugin } from "../Transform/Transform.plugin";
import { FILETREE_CHAT_DND_MIME, HOSTED_ELEMENT_ATTR, LAST_FILETREE_PATH_KEY } from "./HostedSolidWidget.constants";
import { beginHostedDomDrag } from "./HostedSolidWidget.drag";
import {
  createFileElementFromDrop,
  getDefaultWidgetElement,
  getWidgetTypeFromTool,
  isHostedType,
  parseDroppedNode,
  screenToWorld,
  toShellEscapedPathText,
} from "./HostedSolidWidget.helpers";
import { createHostedWidgetMount } from "./HostedSolidWidget.mount";
import { createHostedNode, hostedNodeToElement, isHostedNode, updateHostedNode } from "./HostedSolidWidget.node";
import type { TMountRecord, THostedWidgetElement } from "./HostedSolidWidget.types";

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
      isHostedNode,
      syncNode: (node) => {
        if (!(node instanceof Konva.Rect)) return;
        this.syncMountedNode(node);
      },
      removeNode: (id) => this.unmountWidget(id),
      syncDomOrder: () => this.syncDomOrder(),
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

  private setupToolState(context: IPluginContext) {
    context.hooks.customEvent.tap((event, payload) => {
      if (event !== CustomEvents.TOOL_SELECT) return false;
      this.#activeTool = payload as TTool;
      return false;
    });
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

      this.insertHostedElement(context, getDefaultWidgetElement(undefined, { type: widgetType, x: pointer.x, y: pointer.y }));
    });
  }

  private setupFiletreeNodeDrop(context: IPluginContext) {
    const container = context.stage.container();

    const onDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes(FILETREE_CHAT_DND_MIME)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };

    const onDrop = (event: DragEvent) => {
      const node = parseDroppedNode(event);
      if (!node) return;

      event.preventDefault();

      if (this.tryDropIntoTerminal(context, event, node.path)) return;

      const point = screenToWorld(context, { x: event.clientX, y: event.clientY });

      if (node.is_dir) {
        void this.createFiletreeWidget(context, point, node.path);
        return;
      }

      if (!context.capabilities.file) {
        context.capabilities.notification?.showError("File transport is not configured");
        return;
      }

      this.insertHostedElement(context, createFileElementFromDrop(undefined, {
        x: point.x,
        y: point.y,
        path: node.path,
      }));
    };

    container.addEventListener("dragover", onDragOver);
    container.addEventListener("drop", onDrop);
    context.hooks.destroy.tap(() => {
      container.removeEventListener("dragover", onDragOver);
      container.removeEventListener("drop", onDrop);
    });
  }

  private tryDropIntoTerminal(context: IPluginContext, event: DragEvent, path: string) {
    const mount = this.findTerminalMountAtPoint(event.clientX, event.clientY);
    if (!mount) return false;

      const insertedText = toShellEscapedPathText(path);
    context.setState("mode", CanvasMode.SELECT);
    context.hooks.customEvent.call(CustomEvents.TOOL_SELECT, "select");
    context.setState("selection", [mount.node]);
    context.setState("focusedId", mount.node.id());
    mount.focus();
    mount.insertText(insertedText);
    return true;
  }

  private findTerminalMountAtPoint(clientX: number, clientY: number) {
    const mounts = [...this.#mounts.values()].filter((candidate) => candidate.node.getAttr(HOSTED_ELEMENT_ATTR)?.data?.type === "terminal");

    for (let index = mounts.length - 1; index >= 0; index -= 1) {
      const mount = mounts[index];
      const rect = mount.mountElement.getBoundingClientRect();
      const hit = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
      if (hit) return mount;
    }

    return null;
  }

  private setupCapabilities(context: IPluginContext) {
    const previousCreate = context.capabilities.createShapeFromTElement;
    context.capabilities.createShapeFromTElement = (element) => {
      if (!isHostedType(element.data.type)) return previousCreate?.(element) ?? null;
      return this.createHostedNode(context, element as THostedWidgetElement);
    };

    const previousUpdate = context.capabilities.updateShapeFromTElement;
    context.capabilities.updateShapeFromTElement = (element) => {
      if (!isHostedType(element.data.type)) return previousUpdate?.(element) ?? null;
      const node = context.staticForegroundLayer.findOne((candidate: Konva.Node) => candidate.id() === element.id);
      if (!(node instanceof Konva.Rect) || !isHostedNode(node)) return null;
      this.updateHostedNode(node, element as THostedWidgetElement);
      return node;
    };

    const previousToElement = context.capabilities.toElement;
    context.capabilities.toElement = (node) => {
      if (isHostedNode(node)) return this.toElement(node);
      return previousToElement?.(node) ?? null;
    };
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

    if (filetree.path) localStorage.setItem(LAST_FILETREE_PATH_KEY, filetree.path);
    this.insertHostedElement(context, getDefaultWidgetElement(undefined, {
      type: "filetree",
      x: pointer.x,
      y: pointer.y,
      id: filetree.id as any,
    }));
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
    context.setState("focusedId", node.id());
    return node;
  }

  private createHostedNode(context: IPluginContext, element: THostedWidgetElement) {
    const node = createHostedNode(element);
    node.setAttr(HOSTED_WIDGET_TRANSFORMER_VISIBLE_ATTR, false);
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
    updateHostedNode(node, element);
    this.mountWidgetFromUpdate(node, element);
    this.syncMountedNode(node);
    this.syncDomOrder();
  }

  private setupNodeListeners(context: IPluginContext, node: Konva.Rect) {
    let originalElement: TElement | null = null;

    node.on("destroy", () => this.unmountWidget(node.id()));
    node.on("dragstart", () => {
      originalElement = structuredClone(this.toElement(node));
    });
    node.on("dragmove transform", () => this.syncMountedNode(node));
    node.on("dragend", () => {
      const beforeElement = originalElement ? structuredClone(originalElement) : null;
      const afterElement = structuredClone(this.toElement(node));
      originalElement = null;

      context.crdt.patch({ elements: [afterElement], groups: [] });
      if (!beforeElement) return;
      if (beforeElement.x === afterElement.x && beforeElement.y === afterElement.y) return;

      context.history.record({
        label: "drag-hosted-widget",
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
      if (context.state.mode === CanvasMode.SELECT) context.hooks.customEvent.call(CustomEvents.ELEMENT_POINTERCLICK, event);
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
    mountElement.style.pointerEvents = "none";
    context.worldWidgetsRoot.appendChild(mountElement);

    const record = createHostedWidgetMount({
      context,
      node,
      selectHostedNode: (nextContext, nextNode, event) => this.selectHostedNode(nextContext, nextNode, event),
      beginDomDrag: (nextContext, nextNode, event) => this.beginDomDrag(nextContext, nextNode, event),
      showTransformerForNode: (nextContext, nextNode) => this.showTransformerForNode(nextContext, nextNode),
      removeHostedNode: (nextContext, nextNode) => this.removeHostedNode(nextContext, nextNode),
      reloadHostedNode: (nextContext, nextNode) => this.reloadHostedNode(nextContext, nextNode),
      mountWidgetFromUpdate: (nextNode, nextElement) => this.mountWidgetFromUpdate(nextNode, nextElement),
      syncMountedNode: (nextNode) => this.syncMountedNode(nextNode),
      toElement: (nextNode) => this.toElement(nextNode),
    }, { mountElement, element });

    this.#mounts.set(node.id(), record);
    this.syncMountedNode(node);
    this.syncDomOrder();
  }

  private mountWidgetFromUpdate(node: Konva.Rect, element: THostedWidgetElement) {
    this.#mounts.get(node.id())?.setElement(element);
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
    const bounds = getHostedWidgetScreenBounds(node);
    mounted.mountElement.style.transform = `translate(${bounds.x}px, ${bounds.y}px) rotate(${bounds.rotation}deg) scale(${bounds.zoom})`;
    mounted.mountElement.style.transformOrigin = "top left";
    mounted.mountElement.style.width = `${Math.max(bounds.width, node.width())}px`;
    mounted.mountElement.style.height = `${Math.max(bounds.height, node.height())}px`;
  }

  private syncDomOrder() {
    [...this.#mounts.values()]
      .sort((a, b) => getHostedWidgetOrderKey(a.node).localeCompare(getHostedWidgetOrderKey(b.node)))
      .forEach((entry) => entry.mountElement.parentElement?.appendChild(entry.mountElement));
  }

  private selectHostedNode(context: IPluginContext, node: Konva.Rect, event: PointerEvent | MouseEvent) {
    if (context.state.mode !== CanvasMode.SELECT || event.button !== 0) return;
    node.setAttr(HOSTED_WIDGET_TRANSFORMER_VISIBLE_ATTR, false);

    if (event.shiftKey) {
      const exists = context.state.selection.some((candidate) => candidate.id() === node.id());
      if (exists) {
        context.setState("selection", context.state.selection.filter((candidate) => candidate.id() !== node.id()));
        if (context.state.focusedId === node.id()) context.setState("focusedId", null);
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

  private showTransformerForNode(context: IPluginContext, node: Konva.Rect) {
    node.setAttr(HOSTED_WIDGET_TRANSFORMER_VISIBLE_ATTR, true);
    context.setState("focusedId", node.id());
    if (context.state.selection.length === 1 && context.state.selection[0]?.id() === node.id()) {
      context.setState("selection", [...context.state.selection]);
      return;
    }
    context.setState("selection", [node]);
  }

  private async removeHostedNode(context: IPluginContext, node: Konva.Rect) {
    await this.#mounts.get(node.id())?.beforeRemove?.();
    context.setState("selection", context.state.selection.filter((candidate) => candidate.id() !== node.id()));
    if (context.state.focusedId === node.id()) context.setState("focusedId", null);
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
    beginHostedDomDrag({
      context,
      node,
      cleanupDrag: this.#cleanupDrag,
      setCleanupDrag: (cleanup) => {
        this.#cleanupDrag = cleanup;
      },
      selectHostedNode: (nextContext, nextNode, nextEvent) => this.selectHostedNode(nextContext, nextNode, nextEvent),
      filterSelection: (selection) => TransformPlugin.filterSelection(selection),
      isHostedNode,
      syncMountedNode: (nextNode) => this.syncMountedNode(nextNode),
    }, event);
  }

  private toElement(node: Konva.Rect): THostedWidgetElement {
    return hostedNodeToElement(node);
  }
}
