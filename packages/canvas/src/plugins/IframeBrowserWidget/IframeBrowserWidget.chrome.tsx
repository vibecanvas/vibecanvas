import type { JSX } from "solid-js";
import { For, createEffect, createSignal } from "solid-js";
import FrameIcon from "lucide-solid/icons/frame";
import XIcon from "lucide-solid/icons/x";
import PlusIcon from "lucide-solid/icons/plus";
import ChevronLeftIcon from "lucide-solid/icons/chevron-left";
import ChevronRightIcon from "lucide-solid/icons/chevron-right";
import RefreshCwIcon from "lucide-solid/icons/refresh-cw";
import { ADDRESS_BAR_HEIGHT, CONTENT_INSET, HEADER_HEIGHT } from "./IframeBrowserWidget.constants";
import { normalizeUrl } from "./IframeBrowserWidget.helpers";
import type { TBrowserElement } from "./IframeBrowserWidget.types";

export function BrowserChrome(props: {
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
  const iframeRefs = new Map<string, HTMLIFrameElement>();
  let iframeContainerRef: HTMLDivElement | undefined;

  const activeTab = () => {
    const element = props.element();
    return element.data.tabs.find((tab) => tab.id === element.data.activeTabId) ?? element.data.tabs[0];
  };

  const activeTabUrl = () => activeTab()?.url ?? "";
  const [inputValue, setInputValue] = createSignal(activeTabUrl());
  const [addressBarFocused, setAddressBarFocused] = createSignal(false);

  createEffect(() => {
    const url = activeTabUrl();
    if (!addressBarFocused()) setInputValue(url);
  });

  createEffect(() => {
    if (!iframeContainerRef) return;
    const tabs = props.element().data.tabs;
    const activeTabId = props.element().data.activeTabId;

    for (const tab of tabs) {
      if (iframeRefs.has(tab.id)) continue;
      const iframe = document.createElement("iframe");
      iframe.setAttribute(
        "sandbox",
        "allow-scripts allow-same-origin allow-forms allow-popups allow-presentation",
      );
      iframe.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:none;display:none;";
      iframe.addEventListener("load", () => handleIframeLoad(tab.id));
      iframeContainerRef.appendChild(iframe);
      iframeRefs.set(tab.id, iframe);
      iframe.src = tab.url ? normalizeUrl(tab.url) : "about:blank";
    }

    const currentTabIds = new Set(tabs.map((tab) => tab.id));
    for (const [tabId, iframe] of [...iframeRefs]) {
      if (!currentTabIds.has(tabId)) {
        iframe.remove();
        iframeRefs.delete(tabId);
        continue;
      }
      iframe.style.display = tabId === activeTabId ? "block" : "none";
    }
  });

  const handleNavigateSubmit = () => {
    const normalized = normalizeUrl(inputValue().trim());
    setInputValue(normalized);
    const tabId = activeTab()?.id;
    if (tabId) {
      const iframe = iframeRefs.get(tabId);
      if (iframe) iframe.src = normalized || "about:blank";
    }
    props.onNavigate(normalized);
  };

  const handleHistoryAction = (action: "back" | "forward") => {
    const iframe = iframeRefs.get(activeTab()?.id ?? "");
    if (!iframe) return;
    try {
      iframe.contentWindow?.history[action]();
    } catch {
      // cross-origin
    }
  };

  const handleReload = () => {
    const iframe = iframeRefs.get(activeTab()?.id ?? "");
    if (iframe) iframe.src = iframe.src;
  };

  const handleIframeLoad = (tabId: string) => {
    const iframe = iframeRefs.get(tabId);
    if (!iframe) return;
    try {
      const title = iframe.contentDocument?.title;
      if (title) props.onTitleUpdate(tabId, title);
      const href = iframe.contentWindow?.location.href;
      if (href && href !== "about:blank" && tabId === activeTab()?.id) setInputValue(href);
    } catch {
      // cross-origin
    }
  };

  const borderColor = () => props.element().style.borderColor ?? "#d1d5db";
  const focusBorderColor = () => "#2563eb";
  const resolvedBorderColor = () => props.isFocused() ? focusBorderColor() : borderColor();
  const headerBg = () => props.element().style.headerColor ?? "#f3f4f6";
  const boxShadow = () => props.isFocused()
    ? `0 0 0 1px ${focusBorderColor()}, 0 12px 30px rgba(15,23,42,0.18)`
    : "0 8px 24px rgba(15,23,42,0.12)";
  const interactivePointerEvents = () => props.isInteractive() ? "auto" : "none";

  createEffect(() => {
    const pointerEvents = interactivePointerEvents();
    iframeRefs.forEach((iframe) => {
      iframe.style.pointerEvents = pointerEvents;
    });
  });

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
          "pointer-events": interactivePointerEvents(),
        }}
        onPointerDown={(event) => props.onHeaderPointerDown(event)}
        onDblClick={(event) => props.onHeaderDoubleClick(event)}
      >
        <div style={{ display: "flex", "align-items": "center", gap: "2px", flex: "1", overflow: "hidden", "min-width": "0", "pointer-events": interactivePointerEvents() }}>
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
                    "pointer-events": interactivePointerEvents(),
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    props.onTabActivate(tab.id);
                  }}
                >
                  <span style={{ "font-size": "11px", color: "#374151", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap", "max-width": "110px", "pointer-events": interactivePointerEvents() }}>
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
                      "pointer-events": interactivePointerEvents(),
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
          <button
            type="button"
            aria-label="New tab"
            style={navBtnStyle(interactivePointerEvents())}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              props.onTabAdd();
            }}
          >
            <PlusIcon size={12} />
          </button>
        </div>

        <div style={{ display: "flex", "align-items": "center", gap: "4px", "flex-shrink": "0", "pointer-events": interactivePointerEvents() }}>
          <button
            type="button"
            aria-label="Show resize handles"
            title="Resize"
            style={controlBtnStyle(resolvedBorderColor(), interactivePointerEvents())}
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
            style={controlBtnStyle(resolvedBorderColor(), interactivePointerEvents())}
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
          "pointer-events": interactivePointerEvents(),
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button type="button" aria-label="Go back" style={navBtnStyle(interactivePointerEvents())} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); handleHistoryAction("back"); }}>
          <ChevronLeftIcon size={13} />
        </button>
        <button type="button" aria-label="Go forward" style={navBtnStyle(interactivePointerEvents())} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); handleHistoryAction("forward"); }}>
          <ChevronRightIcon size={13} />
        </button>
        <button type="button" aria-label="Reload" style={navBtnStyle(interactivePointerEvents())} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); handleReload(); }}>
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
            "pointer-events": interactivePointerEvents(),
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

      <div ref={iframeContainerRef} style={{ flex: "1", position: "relative", overflow: "hidden", "pointer-events": interactivePointerEvents() }} />
    </div>
  );
}

function navBtnStyle(pointerEvents: JSX.CSSProperties["pointer-events"]): JSX.CSSProperties {
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
    "pointer-events": pointerEvents,
  };
}

function controlBtnStyle(borderColor: string, pointerEvents: JSX.CSSProperties["pointer-events"]): JSX.CSSProperties {
  return {
    display: "inline-flex",
    "align-items": "center",
    "justify-content": "center",
    width: "22px",
    height: "22px",
    border: `1px solid ${borderColor}`,
    background: "#ffffff",
    color: "#374151",
    cursor: "pointer",
    "border-radius": "3px",
    "pointer-events": pointerEvents,
  };
}
