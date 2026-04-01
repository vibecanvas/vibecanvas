import type { TElement, TIframeBrowserTab } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import { getWorldPosition } from "../shared/node-space";
import { HOSTED_WIDGET_NODE_ATTR } from "../shared/hosted-widget.shared";
import { getNodeZIndex } from "../shared/render-order.shared";
import { BROWSER_ELEMENT_ATTR, BROWSER_TYPE_ATTR } from "./IframeBrowserWidget.constants";
import type { TBrowserElement } from "./IframeBrowserWidget.types";

export function normalizeUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^(https?|about|data|blob):/.test(s)) return s;
  return `https://${s}`;
}

export function getDefaultBrowserElement(x: number, y: number): TBrowserElement {
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
    },
  };
}

export function isBrowserNode(node: Konva.Node | null | undefined): node is Konva.Rect {
  return (
    node instanceof Konva.Rect
    && node.getAttr(HOSTED_WIDGET_NODE_ATTR) === true
    && node.getAttr(BROWSER_TYPE_ATTR) === "iframe-browser"
  );
}

export function addTabToBrowserElement(element: TBrowserElement): TBrowserElement {
  const newTab: TIframeBrowserTab = { id: crypto.randomUUID(), url: "", title: "New Tab" };
  return {
    ...element,
    updatedAt: Date.now(),
    data: {
      ...element.data,
      tabs: [...element.data.tabs, newTab],
      activeTabId: newTab.id,
    },
  };
}

export function closeTabOnBrowserElement(element: TBrowserElement, tabId: string): TBrowserElement {
  if (element.data.tabs.length <= 1) return element;
  const nextTabs = element.data.tabs.filter((tab) => tab.id !== tabId);
  const nextActiveId =
    element.data.activeTabId === tabId
      ? (nextTabs[nextTabs.length - 1]?.id ?? nextTabs[0]?.id ?? "")
      : element.data.activeTabId;
  return {
    ...element,
    updatedAt: Date.now(),
    data: {
      ...element.data,
      tabs: nextTabs,
      activeTabId: nextActiveId,
    },
  };
}

export function activateBrowserTab(element: TBrowserElement, tabId: string): TBrowserElement {
  if (element.data.activeTabId === tabId) return element;
  return {
    ...element,
    updatedAt: Date.now(),
    data: { ...element.data, activeTabId: tabId },
  };
}

export function navigateBrowserTab(element: TBrowserElement, url: string): TBrowserElement {
  const normalized = normalizeUrl(url);
  return {
    ...element,
    updatedAt: Date.now(),
    data: {
      ...element.data,
      tabs: element.data.tabs.map((tab) => (
        tab.id === element.data.activeTabId ? { ...tab, url: normalized } : tab
      )),
    },
  };
}

export function updateBrowserTabTitle(element: TBrowserElement, tabId: string, title: string): TBrowserElement {
  const tab = element.data.tabs.find((candidate) => candidate.id === tabId);
  if (!tab || tab.title === title) return element;
  return {
    ...element,
    data: {
      ...element.data,
      tabs: element.data.tabs.map((candidate) => (
        candidate.id === tabId ? { ...candidate, title } : candidate
      )),
    },
  };
}

export function toElement(node: Konva.Rect): TBrowserElement {
  const snapshot = structuredClone(node.getAttr(BROWSER_ELEMENT_ATTR) as TBrowserElement | undefined);
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

export function cloneElements(elements: Array<TElement | null | undefined>): TElement[] {
  return elements.filter((element): element is TElement => Boolean(element)).map((element) => structuredClone(element));
}
