import type { Accessor } from "solid-js";
import type { THostedWidgetChrome, THostedWidgetElementMap, TFiletreeSafeClient } from "../../services/canvas/interface";
import { FiletreeWidget } from "./FiletreeWidget";

type TFiletreeHostedWidgetProps = {
  element: Accessor<THostedWidgetElementMap["filetree"]>;
  safeClient?: TFiletreeSafeClient;
  setWindowChrome?: (chrome: THostedWidgetChrome | null) => void;
  onPathChange: (path: string) => void;
};

export function FiletreeHostedWidget(props: TFiletreeHostedWidgetProps) {
  if (!props.safeClient) {
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
        safeClient={props.safeClient}
        setWindowChrome={props.setWindowChrome}
        onPathChange={props.onPathChange}
      />
    </div>
  );
}
