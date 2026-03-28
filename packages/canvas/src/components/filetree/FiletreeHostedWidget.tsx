import type { Accessor } from "solid-js";
import { onCleanup } from "solid-js";
import type { THostedWidgetElementMap, TFiletreeSafeClient } from "../../services/canvas/interface";
import { FiletreeWidget } from "./FiletreeWidget";

type TFiletreeHostedWidgetProps = {
  element: Accessor<THostedWidgetElementMap["filetree"]>;
  canvasId?: string;
  safeClient?: TFiletreeSafeClient;
  registerBeforeRemove?: (handler: (() => void | Promise<void>) | null) => void;
};

export function FiletreeHostedWidget(props: TFiletreeHostedWidgetProps) {
  if (props.safeClient) {
    props.registerBeforeRemove?.(async () => {
      await props.safeClient?.api.filetree.remove({ params: { id: props.element().id } });
    });

    onCleanup(() => {
      props.registerBeforeRemove?.(null);
    });
  }

  if (!props.safeClient || !props.canvasId) {
    return (
      <div class="flex h-full w-full flex-1 items-center justify-center px-4 text-center text-xs text-muted-foreground">
        Filetree transport is not configured for this host.
      </div>
    );
  }

  return (
    <div class="h-full w-full min-h-0 flex-1">
      <FiletreeWidget
        canvasId={props.canvasId}
        filetreeId={props.element().id}
        safeClient={props.safeClient}
      />
    </div>
  );
}
