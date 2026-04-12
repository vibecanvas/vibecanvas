import type { TOrpcSafeClient } from "@vibecanvas/orpc-client";
import type { Accessor } from "solid-js";
import type { THostedWidgetChrome, THostedWidgetElementMap } from "../../services/canvas/interface";
import { FiletreeWidget } from "./FiletreeWidget";

type TFiletreeHostedWidgetProps = {
  element: Accessor<THostedWidgetElementMap["filetree"]>;
  apiService?: TOrpcSafeClient;
  setWindowChrome?: (chrome: THostedWidgetChrome | null) => void;
  onPathChange: (path: string) => void;
  onOpenFile?: (path: string) => void;
};

export function FiletreeHostedWidget(props: TFiletreeHostedWidgetProps) {
  if (!props.apiService) {
    return (
      <div style={{ display: "flex", width: "100%", height: "100%", flex: 1, "align-items": "center", "justify-content": "center", padding: "0 1rem", "text-align": "center", "font-size": "0.75rem", color: "var(--muted-foreground)" }}>
        Filetree transport is not configured for this host.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", "min-width": "0", "min-height": "0", flex: 1 }}>
      <FiletreeWidget
        element={props.element}
        apiService={props.apiService}
        setWindowChrome={props.setWindowChrome}
        onPathChange={props.onPathChange}
        onOpenFile={props.onOpenFile}
      />
    </div>
  );
}
