import type { IPluginContext, TMouseEvent, TPointerEvent, TWheelEvent } from "../shared/interface";
import type { TCrdtOp, TModifiers, TRecording, TStep } from "./Recorder.types";

export function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function getModifiers(event: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">): TModifiers {
  return {
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
  };
}

export function getPointerPosition(context: IPluginContext) {
  const pointer = context.stage.getPointerPosition();

  return {
    x: pointer?.x ?? 0,
    y: pointer?.y ?? 0,
  };
}

export function getTargetId(event: TPointerEvent | TMouseEvent | TWheelEvent): string | null {
  const id = event.target?.id?.();
  return id || null;
}

export function createEmptyRecording(payload: { reducedEvents: boolean }): TRecording {
  return {
    name: "canvas-recording",
    initialDoc: null,
    reducedEvents: payload.reducedEvents,
    steps: [],
    crdtOps: [],
  };
}

export function createStartedRecording(
  payload: { initialDoc: TRecording["initialDoc"]; reducedEvents: boolean; now: number },
): TRecording {
  return {
    name: `canvas-recording-${payload.now}`,
    initialDoc: cloneValue(payload.initialDoc),
    reducedEvents: payload.reducedEvents,
    steps: [],
    crdtOps: [],
  };
}

export function canExportRecording(payload: { recording: TRecording }): boolean {
  return payload.recording.steps.length > 0 || payload.recording.crdtOps.length > 0;
}

export function createPointerStep(
  runtime: { context: IPluginContext },
  payload: {
    eventName: "pointerdown" | "pointerup" | "pointerout" | "pointerover" | "pointercancel";
    event: TPointerEvent;
  },
): TStep {
  const { x, y } = getPointerPosition(runtime.context);

  return {
    type: "pointer",
    event: payload.eventName,
    targetId: getTargetId(payload.event),
    x,
    y,
    modifiers: getModifiers(payload.event.evt),
  };
}

export function createPointerMoveStep(runtime: { context: IPluginContext }, payload: { event: TPointerEvent }): TStep {
  const { x, y } = getPointerPosition(runtime.context);

  return {
    type: "pointermove",
    targetId: getTargetId(payload.event),
    x,
    y,
    modifiers: getModifiers(payload.event.evt),
  };
}

export function createWheelStep(runtime: { context: IPluginContext }, payload: { event: TWheelEvent }): TStep {
  const { x, y } = getPointerPosition(runtime.context);

  return {
    type: "wheel",
    targetId: getTargetId(payload.event),
    x,
    y,
    deltaX: payload.event.evt.deltaX,
    deltaY: payload.event.evt.deltaY,
    modifiers: getModifiers(payload.event.evt),
  };
}

export function createKeyStep(payload: { eventName: "keydown" | "keyup"; event: KeyboardEvent }): TStep {
  return {
    type: "key",
    event: payload.eventName,
    key: payload.event.key,
    modifiers: getModifiers(payload.event),
  };
}

export function createDragStep(
  runtime: { context: IPluginContext },
  payload: { eventName: "dragstart" | "dragmove" | "dragend"; event: TMouseEvent },
): TStep {
  const { x, y } = getPointerPosition(runtime.context);

  return {
    type: "drag",
    event: payload.eventName,
    targetId: getTargetId(payload.event),
    x,
    y,
    modifiers: getModifiers(payload.event.evt),
  };
}

export function createPatchCrdtOp(payload: {
  patch: { elements: Array<Record<string, unknown>>; groups: Array<Record<string, unknown>> };
}): TCrdtOp {
  return {
    type: "patch",
    payload: cloneValue(payload.patch),
  };
}

export function createDeleteCrdtOp(payload: { deleteById: { elementIds?: string[]; groupIds?: string[] } }): TCrdtOp {
  return {
    type: "delete",
    payload: cloneValue(payload.deleteById),
  };
}
