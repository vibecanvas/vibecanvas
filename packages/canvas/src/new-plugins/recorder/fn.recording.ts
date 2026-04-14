import type { TMouseEvent, TPointerEvent, TWheelEvent } from "../../runtime";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { TCrdtOp, TModifiers, TRecording, TStep } from "./CONSTANTS";

export function fxCloneValue<T>(args: { value: T }): T {
  return JSON.parse(JSON.stringify(args.value)) as T;
}

export function fxGetModifiers(args: {
  event: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">;
}): TModifiers {
  return {
    altKey: args.event.altKey,
    ctrlKey: args.event.ctrlKey,
    metaKey: args.event.metaKey,
    shiftKey: args.event.shiftKey,
  };
}

export function fxGetPointerPosition(args: {
  render: RenderService;
}) {
  const pointer = args.render.stage.getPointerPosition();

  return {
    x: pointer?.x ?? 0,
    y: pointer?.y ?? 0,
  };
}

export function fxGetTargetId(args: {
  event: TPointerEvent | TMouseEvent | TWheelEvent;
}): string | null {
  const id = args.event.target?.id?.();
  return id || null;
}

export function fxCreateEmptyRecording(args: { reducedEvents: boolean }): TRecording {
  return {
    name: "canvas-recording",
    initialDoc: null,
    reducedEvents: args.reducedEvents,
    steps: [],
    crdtOps: [],
  };
}

export function fxCreateStartedRecording(args: {
  crdt: CrdtService;
  reducedEvents: boolean;
  now: number;
}): TRecording {
  return {
    name: `canvas-recording-${args.now}`,
    initialDoc: fxCloneValue({ value: args.crdt.doc() }),
    reducedEvents: args.reducedEvents,
    steps: [],
    crdtOps: [],
  };
}

export function fxCanExportRecording(args: { recording: TRecording }): boolean {
  return args.recording.steps.length > 0 || args.recording.crdtOps.length > 0;
}

export function fxCreatePointerStep(args: {
  render: RenderService;
  eventName: "pointerdown" | "pointerup" | "pointerout" | "pointerover" | "pointercancel";
  event: TPointerEvent;
}): TStep {
  const { x, y } = fxGetPointerPosition({ render: args.render });

  return {
    type: "pointer",
    event: args.eventName,
    targetId: fxGetTargetId({ event: args.event }),
    x,
    y,
    modifiers: fxGetModifiers({ event: args.event.evt }),
  };
}

export function fxCreatePointerMoveStep(args: { render: RenderService; event: TMouseEvent }): TStep {
  const { x, y } = fxGetPointerPosition({ render: args.render });

  return {
    type: "pointermove",
    targetId: fxGetTargetId({ event: args.event }),
    x,
    y,
    modifiers: fxGetModifiers({ event: args.event.evt }),
  };
}

export function fxCreateWheelStep(args: { render: RenderService; event: TWheelEvent }): TStep {
  const { x, y } = fxGetPointerPosition({ render: args.render });

  return {
    type: "wheel",
    targetId: fxGetTargetId({ event: args.event }),
    x,
    y,
    deltaX: args.event.evt.deltaX,
    deltaY: args.event.evt.deltaY,
    modifiers: fxGetModifiers({ event: args.event.evt }),
  };
}

export function fxCreateKeyStep(args: { eventName: "keydown" | "keyup"; event: KeyboardEvent }): TStep {
  return {
    type: "key",
    event: args.eventName,
    key: args.event.key,
    modifiers: fxGetModifiers({ event: args.event }),
  };
}

export function fxCreateDragStep(args: {
  render: RenderService;
  eventName: "dragstart" | "dragmove" | "dragend";
  event: TMouseEvent;
}): TStep {
  const { x, y } = fxGetPointerPosition({ render: args.render });

  return {
    type: "drag",
    event: args.eventName,
    targetId: fxGetTargetId({ event: args.event }),
    x,
    y,
    modifiers: fxGetModifiers({ event: args.event.evt }),
  };
}

export function fxCreatePatchCrdtOp(args: {
  patch: { elements: Array<Record<string, unknown>>; groups: Array<Record<string, unknown>> };
}): TCrdtOp {
  return {
    type: "patch",
    payload: fxCloneValue({ value: args.patch }),
  };
}

export function fxCreateDeleteCrdtOp(args: { deleteById: { elementIds?: string[]; groupIds?: string[] } }): TCrdtOp {
  return {
    type: "delete",
    payload: fxCloneValue({ value: args.deleteById }),
  };
}
