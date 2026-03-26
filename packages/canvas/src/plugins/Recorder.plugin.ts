import Konva from "konva";
import { createComponent, createSignal, type Accessor, type Setter } from "solid-js";
import { render } from "solid-js/web";
import type { TCanvasDoc } from "@vibecanvas/shell/automerge/index";
import { CanvasRecorder } from "../components/CanvasRecorder";
import type { IPlugin, IPluginContext, TMouseEvent, TPointerEvent, TWheelEvent } from "./interface";

const REDUCED_EVENTS = true;

type TModifiers = {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

type TStep =
  | {
      type: "pointer";
      event: "pointerdown" | "pointerup" | "pointerout" | "pointerover" | "pointercancel";
      targetId: string | null;
      x: number;
      y: number;
      modifiers: TModifiers;
    }
  | {
      type: "pointermove";
      targetId: string | null;
      x: number;
      y: number;
      modifiers: TModifiers;
    }
  | {
      type: "drag";
      event: "dragstart" | "dragmove" | "dragend";
      targetId: string | null;
      x: number;
      y: number;
      modifiers: TModifiers;
    }
  | {
      type: "wheel";
      targetId: string | null;
      x: number;
      y: number;
      deltaX: number;
      deltaY: number;
      modifiers: TModifiers;
    }
  | {
      type: "key";
      event: "keydown" | "keyup";
      key: string;
      modifiers: TModifiers;
    };

type TCrdtOp =
  | {
      type: "patch";
      payload: { elements: Array<Record<string, unknown>>; groups: Array<Record<string, unknown>> };
    }
  | {
      type: "delete";
      payload: { elementIds?: string[]; groupIds?: string[] };
    };

type TRecording = {
  name: string;
  initialDoc: TCanvasDoc | null;
  reducedEvents: boolean;
  steps: TStep[];
  crdtOps: TCrdtOp[];
};

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function getModifiers(event: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">): TModifiers {
  return {
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
  };
}

function getPointerPosition(context: IPluginContext) {
  const pointer = context.stage.getPointerPosition();

  return {
    x: pointer?.x ?? 0,
    y: pointer?.y ?? 0,
  };
}

function getTargetId(event: TPointerEvent | TMouseEvent | TWheelEvent): string | null {
  const id = event.target?.id?.();
  return id || null;
}

function downloadJsonFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

async function saveJsonFile(fileName: string, content: string) {
  const picker = (window as typeof window & {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<{
      createWritable: () => Promise<{
        write: (data: string) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  }).showSaveFilePicker;

  if (!picker) {
    downloadJsonFile(fileName, content);
    return;
  }

  try {
    const handle = await picker({
      suggestedName: fileName,
      types: [
        {
          description: "JSON files",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }

    throw error;
  }
}

function mountSolidComponent(
  context: IPluginContext,
  open: Accessor<boolean>,
  setOpen: (open: boolean) => void,
  recording: Accessor<boolean>,
  stepCount: Accessor<number>,
  opCount: Accessor<number>,
  reducedEvents: Accessor<boolean>,
  setReducedEvents: (value: boolean) => void,
  canExport: Accessor<boolean>,
  actions: {
    start: () => void;
    stop: () => void;
    clear: () => void;
    export: () => void;
  },
) {
  const mountElement = document.createElement("div");
  mountElement.className = "absolute inset-0 pointer-events-none";
  context.stage.container().appendChild(mountElement);

  const disposeRender = render(
    () =>
      createComponent(CanvasRecorder, {
        open,
        onOpenChange: setOpen,
        recording,
        stepCount,
        opCount,
        reducedEvents,
        onReducedEventsChange: setReducedEvents,
        canExport,
        onStart: actions.start,
        onStop: actions.stop,
        onClear: actions.clear,
        onExport: actions.export,
      }),
    mountElement,
  );

  return { mountElement, disposeRender };
}

export class RecorderPlugin implements IPlugin {
  #recording = false;
  #reducedEvents = REDUCED_EVENTS;
  #pointerPressed = false;
  #recordingData: TRecording = {
    name: "canvas-recording",
    initialDoc: null,
    reducedEvents: REDUCED_EVENTS,
    steps: [],
    crdtOps: [],
  };
  #restoreCrdtPatch: (() => void) | null = null;
  #restoreCrdtDelete: (() => void) | null = null;
  #restoreNodeFire: (() => void) | null = null;
  #open: Accessor<boolean>;
  #setOpen: Setter<boolean>;
  #recordingSignal: Accessor<boolean>;
  #setRecordingSignal: Setter<boolean>;
  #stepCount: Accessor<number>;
  #setStepCount: Setter<number>;
  #opCount: Accessor<number>;
  #setOpCount: Setter<number>;
  #reducedEventsSignal: Accessor<boolean>;
  #setReducedEventsSignal: Setter<boolean>;
  #canExport: Accessor<boolean>;
  #setCanExport: Setter<boolean>;
  #mountElement: HTMLDivElement | null = null;
  #disposeRender: (() => void) | null = null;

  constructor() {
    const [open, setOpen] = createSignal(false);
    const [recordingSignal, setRecordingSignal] = createSignal(false);
    const [stepCount, setStepCount] = createSignal(0);
    const [opCount, setOpCount] = createSignal(0);
    const [reducedEventsSignal, setReducedEventsSignal] = createSignal(REDUCED_EVENTS);
    const [canExport, setCanExport] = createSignal(false);

    this.#open = open;
    this.#setOpen = setOpen;
    this.#recordingSignal = recordingSignal;
    this.#setRecordingSignal = setRecordingSignal;
    this.#stepCount = stepCount;
    this.#setStepCount = setStepCount;
    this.#opCount = opCount;
    this.#setOpCount = setOpCount;
    this.#reducedEventsSignal = reducedEventsSignal;
    this.#setReducedEventsSignal = setReducedEventsSignal;
    this.#canExport = canExport;
    this.#setCanExport = setCanExport;
  }

  apply(context: IPluginContext): void {
    context.hooks.init.tap(() => {
      const { mountElement, disposeRender } = mountSolidComponent(
        context,
        this.#open,
        this.#setOpen,
        this.#recordingSignal,
        this.#stepCount,
        this.#opCount,
        this.#reducedEventsSignal,
        (value) => {
          this.#reducedEvents = value;
          this.#recordingData.reducedEvents = value;
          this.#setReducedEventsSignal(value);
        },
        this.#canExport,
        {
          start: () => this.startRecording(context),
          stop: () => this.stopRecording(),
          clear: () => this.clearRecording(),
          export: () => void this.exportRecording(),
        },
      );

      this.#mountElement = mountElement;
      this.#disposeRender = disposeRender;
      this.syncUi();
    });

    context.hooks.destroy.tap(() => {
      this.#restoreCrdtPatch?.();
      this.#restoreCrdtDelete?.();
      this.#restoreNodeFire?.();
      this.#restoreCrdtPatch = null;
      this.#restoreCrdtDelete = null;
      this.#restoreNodeFire = null;
      this.#disposeRender?.();
      this.#mountElement?.remove();
      this.#disposeRender = null;
      this.#mountElement = null;
    });

    this.captureHooks(context);
    this.captureCrdt(context);
  }

  private captureHooks(context: IPluginContext) {
    const originalFire = Konva.Node.prototype.fire;
    const plugin = this;
    Konva.Node.prototype.fire = (function (this: Konva.Node, eventType: string, evt?: object, bubble?: boolean) {
      if (eventType === "dragstart" || eventType === "dragmove" || eventType === "dragend") {
        plugin.recordDragEvent(context, eventType, {
          target: this,
          currentTarget: this,
          evt: (evt as { evt?: MouseEvent } | undefined)?.evt ?? new MouseEvent(eventType, { bubbles: true }),
        } as TMouseEvent);
      }

      return originalFire.call(this, eventType, evt, bubble);
    }) as typeof Konva.Node.prototype.fire;
    this.#restoreNodeFire = () => {
      Konva.Node.prototype.fire = originalFire;
    };

    context.hooks.pointerDown.tap((event) => {
      this.#pointerPressed = true;
      this.recordPointerEvent(context, "pointerdown", event);
    });

    context.hooks.pointerUp.tap((event) => {
      this.recordPointerEvent(context, "pointerup", event);
      this.#pointerPressed = false;
    });

    context.hooks.pointerOut.tap((event) => {
      this.recordPointerEvent(context, "pointerout", event);
    });

    context.hooks.pointerOver.tap((event) => {
      this.recordPointerEvent(context, "pointerover", event);
    });

    context.hooks.pointerCancel.tap((event) => {
      this.recordPointerEvent(context, "pointercancel", event);
      this.#pointerPressed = false;
    });

    context.hooks.pointerMove.tap((event) => {
      if (!this.#recording) return;
      if (this.#reducedEvents && !this.#pointerPressed) return;

      const { x, y } = getPointerPosition(context);
      this.pushStep({
        type: "pointermove",
        targetId: getTargetId(event),
        x,
        y,
        modifiers: getModifiers(event.evt),
      });
    });

    context.hooks.pointerWheel.tap((event) => {
      if (!this.#recording) return;

      const { x, y } = getPointerPosition(context);
      this.pushStep({
        type: "wheel",
        targetId: getTargetId(event),
        x,
        y,
        deltaX: event.evt.deltaX,
        deltaY: event.evt.deltaY,
        modifiers: getModifiers(event.evt),
      });
    });

    context.hooks.keydown.tap((event) => {
      this.recordKeyEvent("keydown", event);
      return false;
    });

    context.hooks.keyup.tap((event) => {
      this.recordKeyEvent("keyup", event);
      return false;
    });
  }

  private captureCrdt(context: IPluginContext) {
    const originalPatch = context.crdt.patch.bind(context.crdt);
    const originalDeleteById = context.crdt.deleteById.bind(context.crdt);

    context.crdt.patch = ((payload) => {
      if (this.#recording) {
        this.pushCrdtOp({
          type: "patch",
          payload: cloneValue(payload) as { elements: Array<Record<string, unknown>>; groups: Array<Record<string, unknown>> },
        });
      }

      originalPatch(payload);
    }) as typeof context.crdt.patch;

    context.crdt.deleteById = ((payload) => {
      if (this.#recording) {
        this.pushCrdtOp({
          type: "delete",
          payload: cloneValue(payload),
        });
      }

      originalDeleteById(payload);
    }) as typeof context.crdt.deleteById;

    this.#restoreCrdtPatch = () => {
      context.crdt.patch = originalPatch;
    };

    this.#restoreCrdtDelete = () => {
      context.crdt.deleteById = originalDeleteById;
    };
  }

  private startRecording(context: IPluginContext) {
    this.#recordingData = {
      name: `canvas-recording-${Date.now()}`,
      initialDoc: cloneValue(context.crdt.docHandle.doc()),
      reducedEvents: this.#reducedEvents,
      steps: [],
      crdtOps: [],
    };
    this.#recording = true;
    this.syncUi();
  }

  private stopRecording() {
    this.#recording = false;
    this.syncUi();
  }

  private clearRecording() {
    this.#recording = false;
    this.#recordingData = {
      name: "canvas-recording",
      initialDoc: null,
      reducedEvents: this.#reducedEvents,
      steps: [],
      crdtOps: [],
    };
    this.syncUi();
  }

  private async exportRecording() {
    await saveJsonFile(`${this.#recordingData.name}.json`, JSON.stringify(this.#recordingData, null, 2));
  }

  private pushStep(step: TStep) {
    this.#recordingData.steps.push(step);
    this.syncUi();
  }

  private pushCrdtOp(op: TCrdtOp) {
    this.#recordingData.crdtOps.push(op);
    this.syncUi();
  }

  private recordPointerEvent(
    context: IPluginContext,
    eventName: "pointerdown" | "pointerup" | "pointerout" | "pointerover" | "pointercancel",
    event: TPointerEvent,
  ) {
    if (!this.#recording) return;

    const { x, y } = getPointerPosition(context);
    this.pushStep({
      type: "pointer",
      event: eventName,
      targetId: getTargetId(event),
      x,
      y,
      modifiers: getModifiers(event.evt),
    });
  }

  private recordKeyEvent(eventName: "keydown" | "keyup", event: KeyboardEvent) {
    if (!this.#recording) return;

    this.pushStep({
      type: "key",
      event: eventName,
      key: event.key,
      modifiers: getModifiers(event),
    });
  }

  private recordDragEvent(
    context: IPluginContext,
    eventName: "dragstart" | "dragmove" | "dragend",
    event: TMouseEvent,
  ) {
    if (!this.#recording) return;

    const { x, y } = getPointerPosition(context);
    this.pushStep({
      type: "drag",
      event: eventName,
      targetId: getTargetId(event),
      x,
      y,
      modifiers: getModifiers(event.evt),
    });
  }

  private syncUi() {
    this.#setRecordingSignal(this.#recording);
    this.#setStepCount(this.#recordingData.steps.length);
    this.#setOpCount(this.#recordingData.crdtOps.length);
    this.#setReducedEventsSignal(this.#reducedEvents);
    this.#setCanExport(this.#recordingData.steps.length > 0 || this.#recordingData.crdtOps.length > 0);
  }
}
