import type { Accessor } from "solid-js";
import type { THostedWidgetElementMap, TFileSafeClient } from "../../services/canvas/interface";
import { FileWidget } from "./FileWidget";

type TFileHostedWidgetProps = {
  element: Accessor<THostedWidgetElementMap["file"]>;
  safeClient?: TFileSafeClient;
  requestInitialSize?: (size: { width: number; height: number }) => void;
};

export function FileHostedWidget(props: TFileHostedWidgetProps) {
  if (!props.safeClient) {
    return (
      <div class="flex h-full w-full flex-1 items-center justify-center px-4 text-center text-xs text-muted-foreground">
        File transport is not configured for this host.
      </div>
    );
  }

  return (
    <div class="h-full w-full min-h-0 min-w-0 flex-1">
      <FileWidget element={props.element} safeClient={props.safeClient} requestInitialSize={props.requestInitialSize} />
    </div>
  );
}
