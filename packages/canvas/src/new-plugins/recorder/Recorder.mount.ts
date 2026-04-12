import { createComponent, type Accessor } from "solid-js";
import { render } from "solid-js/web";
import { CanvasRecorder } from "../../components/CanvasRecorder";
import type { RenderService } from "../../new-services/render/RenderService";

export function mountRecorderPanel(args: {
  renderService: RenderService;
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
    copy: () => void;
    export: () => void;
  };
}) {
  const mountElement = document.createElement("div");
  mountElement.className = "absolute inset-0 pointer-events-none";
  args.renderService.stage.container().appendChild(mountElement);

  const disposeRender = render(
    () =>
      createComponent(CanvasRecorder, {
        open: args.open,
        onOpenChange: args.setOpen,
        recording: args.recording,
        stepCount: args.stepCount,
        opCount: args.opCount,
        reducedEvents: args.reducedEvents,
        onReducedEventsChange: args.setReducedEvents,
        canExport: args.canExport,
        onStart: args.actions.start,
        onStop: args.actions.stop,
        onClear: args.actions.clear,
        onCopy: args.actions.copy,
        onExport: args.actions.export,
      }),
    mountElement,
  );

  return {
    mountElement,
    dispose() {
      disposeRender();
      mountElement.remove();
    },
  };
}
