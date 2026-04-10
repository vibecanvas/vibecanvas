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
      <div class="flex h-full w-full flex-1 items-center justify-center px-4 text-center text-xs text-muted-foreground">
        Filetree transport is not configured for this host.
      </div>
    );
  }

  return (
    <div class="h-full w-full min-h-0 flex-1">
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
