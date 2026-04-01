import { createComponent, type Accessor } from "solid-js";
import { render } from "solid-js/web";
import { CanvasRecorder } from "../../components/CanvasRecorder";
import type { IPluginContext } from "../shared/interface";

export function mountSolidComponent(
  runtime: { context: IPluginContext },
  payload: {
    open: Accessor<boolean>;
    setOpen: (open: boolean) => void;
    recording: Accessor<boolean>;
    stepCount: Accessor<number>;
    opCount: Accessor<number>;
    reducedEvents: Accessor<boolean>;
    setReducedEvents: (value: boolean) => void;
    canExport: Accessor<boolean>;
    actions: {
      start: () => void;
      stop: () => void;
      clear: () => void;
      export: () => void;
    };
  },
) {
  const mountElement = document.createElement("div");
  mountElement.className = "absolute inset-0 pointer-events-none";
  runtime.context.stage.container().appendChild(mountElement);

  const disposeRender = render(
    () =>
      createComponent(CanvasRecorder, {
        open: payload.open,
        onOpenChange: payload.setOpen,
        recording: payload.recording,
        stepCount: payload.stepCount,
        opCount: payload.opCount,
        reducedEvents: payload.reducedEvents,
        onReducedEventsChange: payload.setReducedEvents,
        canExport: payload.canExport,
        onStart: payload.actions.start,
        onStop: payload.actions.stop,
        onClear: payload.actions.clear,
        onExport: payload.actions.export,
      }),
    mountElement,
  );

  return { mountElement, disposeRender };
}
