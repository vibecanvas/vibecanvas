import type { TMouseEvent, TPointerEvent, TWheelEvent } from "../../runtime";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { RenderService } from "../../new-services/render/RenderService";
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

export function getPointerPosition(render: RenderService) {
  const pointer = render.stage.getPointerPosition();

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

export function createStartedRecording(payload: {
  crdt: CrdtService;
  reducedEvents: boolean;
  now: number;
}): TRecording {
  return {
    name: `canvas-recording-${payload.now}`,
    initialDoc: cloneValue(payload.crdt.doc()),
    reducedEvents: payload.reducedEvents,
    steps: [],
    crdtOps: [],
  };
}

export function canExportRecording(payload: { recording: TRecording }): boolean {
  return payload.recording.steps.length > 0 || payload.recording.crdtOps.length > 0;
}

export function createPointerStep(payload: {
  render: RenderService;
  eventName: "pointerdown" | "pointerup" | "pointerout" | "pointerover" | "pointercancel";
  event: TPointerEvent;
}): TStep {
  const { x, y } = getPointerPosition(payload.render);

  return {
    type: "pointer",
    event: payload.eventName,
    targetId: getTargetId(payload.event),
    x,
    y,
    modifiers: getModifiers(payload.event.evt),
  };
}

export function createPointerMoveStep(payload: { render: RenderService; event: TMouseEvent }): TStep {
  const { x, y } = getPointerPosition(payload.render);

  return {
    type: "pointermove",
    targetId: getTargetId(payload.event),
    x,
    y,
    modifiers: getModifiers(payload.event.evt),
  };
}

export function createWheelStep(payload: { render: RenderService; event: TWheelEvent }): TStep {
  const { x, y } = getPointerPosition(payload.render);

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

export function createDragStep(payload: {
  render: RenderService;
  eventName: "dragstart" | "dragmove" | "dragend";
  event: TMouseEvent;
}): TStep {
  const { x, y } = getPointerPosition(payload.render);

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
