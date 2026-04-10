import FrameIcon from "lucide-solid/icons/frame";
import RefreshCw from "lucide-solid/icons/refresh-cw";
import XIcon from "lucide-solid/icons/x";
import type { JSX } from "solid-js";
import { children, Show } from "solid-js";
import type { TTerminalData } from "@vibecanvas/service-automerge/types/canvas-doc";
import { getDefaultWidgetChrome, getWidgetHeaderLabel } from "./HostedSolidWidget.helpers";
import type { THostedWidgetChrome, THostedWidgetElement } from "./HostedSolidWidget.types";

export function HostedWidgetShell(props: {
  element: () => THostedWidgetElement;
  windowChrome: () => THostedWidgetChrome | null;
  isFocused: () => boolean;
  isInteractive: () => boolean;
  onHeaderPointerDown: (event: PointerEvent | MouseEvent) => void;
  onHeaderDoubleClick: (event: MouseEvent) => void;
  onSelectPointerDown: (event: PointerEvent | MouseEvent) => void;
  onRemove: () => void;
  onReload?: () => void;
  children?: JSX.Element;
}) {
  const resolvedChildren = children(() => props.children);
  const resolvedWindowChrome = () => ({
    ...getDefaultWidgetChrome(props.element()),
    ...(props.windowChrome() ?? {}),
  });
  const title = () => resolvedWindowChrome().title ?? getWidgetHeaderLabel(props.element());
  const subtitle = () => resolvedWindowChrome().subtitle ?? null;
  const titleColor = () => props.element().data.type === "terminal" ? "#f8fafc" : "#0f172a";
  const headerBackground = () => props.element().data.type === "terminal"
    ? "#0b1220"
    : (props.element().style.headerColor ?? "#e5e7eb");
  const secondaryTextColor = () => props.element().data.type === "terminal" ? "#94a3b8" : "#475569";
  const focusBorderColor = () => props.element().data.type === "terminal" ? "#67e8f9" : "#2563eb";
  const borderColor = () => props.isFocused() ? focusBorderColor() : (props.element().style.borderColor ?? "#cbd5e1");
  const boxShadow = () => props.isFocused()
    ? `0 0 0 1px ${focusBorderColor()}, 0 12px 30px rgba(15,23,42,0.22)`
    : "0 8px 24px rgba(15,23,42,0.16)";
  const interactivePointerEvents = () => props.isInteractive() ? "auto" : "none";

  return (
    <div
      data-hosted-widget-root="true"
      data-hosted-widget-focused={props.isFocused() ? "true" : "false"}
      data-hosted-widget-interactive={props.isInteractive() ? "true" : "false"}
      style={{
        position: "absolute",
        inset: "0",
        display: "flex",
        "flex-direction": "column",
        "pointer-events": props.isInteractive() ? "auto" : "none",
        "box-sizing": "border-box",
        border: `1px solid ${borderColor()}`,
        background: props.element().style.backgroundColor ?? "#ffffff",
        "box-shadow": boxShadow(),
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
          "border-bottom": `1px solid ${borderColor()}`,
          cursor: "grab",
          "user-select": "none",
          "pointer-events": interactivePointerEvents(),
        }}
        onPointerDown={(event) => props.onHeaderPointerDown(event)}
        onDblClick={(event) => props.onHeaderDoubleClick(event)}
      >
        <div style={{ display: "flex", "align-items": "baseline", gap: "8px", overflow: "hidden", "min-width": "0", "pointer-events": interactivePointerEvents() }}>
          <div
            data-hosted-widget-title="true"
            style={{ "font-size": "12px", color: titleColor(), "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis", "pointer-events": interactivePointerEvents() }}
          >
            {title()}
          </div>
          <Show when={subtitle()}>
            <div
              data-hosted-widget-subtitle="true"
              style={{ "font-size": "10px", color: secondaryTextColor(), "text-transform": "uppercase", "letter-spacing": "0.08em", "pointer-events": interactivePointerEvents() }}
            >
              {subtitle()}
            </div>
          </Show>
        </div>
        <div style={{ display: "flex", "align-items": "center", gap: "6px", "pointer-events": interactivePointerEvents() }}>
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
              border: `1px solid ${props.element().data.type === "terminal" ? "#334155" : borderColor()}`,
              background: props.element().data.type === "terminal" ? "#111827" : "#ffffff",
              color: titleColor(),
              cursor: "pointer",
              "pointer-events": interactivePointerEvents(),
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
              border: `1px solid ${props.element().data.type === "terminal" ? "#334155" : borderColor()}`,
              background: props.element().data.type === "terminal" ? "#111827" : "#ffffff",
              color: titleColor(),
              cursor: "pointer",
              "pointer-events": interactivePointerEvents(),
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
              border: `1px solid ${props.element().data.type === "terminal" ? "#334155" : borderColor()}`,
              background: props.element().data.type === "terminal" ? "#111827" : "#ffffff",
              color: titleColor(),
              cursor: "pointer",
              "pointer-events": interactivePointerEvents(),
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
      <div style={{ flex: 1, display: "flex", overflow: "hidden", "pointer-events": interactivePointerEvents() }}>
        <Show when={resolvedChildren()} fallback={<DefaultWidgetBody element={props.element} />}>
          {resolvedChildren()}
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
