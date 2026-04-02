import Konva from "konva";
import { createSignal, type Accessor, type Setter } from "solid-js";
import type { IPlugin, IPluginContext, TMouseEvent, TPointerEvent } from "../shared/interface";
import {
  canExportRecording,
  createDeleteCrdtOp,
  createDragStep,
  createEmptyRecording,
  createKeyStep,
  createPatchCrdtOp,
  createPointerMoveStep,
  createPointerStep,
  createStartedRecording,
  createWheelStep,
} from "./Recorder.helpers";
import { saveJsonFile } from "./Recorder.file";
import { mountSolidComponent } from "./Recorder.mount";
import { REDUCED_EVENTS, type TCrdtOp, type TRecording, type TStep } from "./Recorder.types";

export class RecorderPlugin implements IPlugin {
  #recording = false;
  #reducedEvents = REDUCED_EVENTS;
  #pointerPressed = false;
  #recordingData: TRecording = createEmptyRecording({ reducedEvents: REDUCED_EVENTS });
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
        { context },
        {
          open: this.#open,
          setOpen: this.#setOpen,
          recording: this.#recordingSignal,
          stepCount: this.#stepCount,
          opCount: this.#opCount,
          reducedEvents: this.#reducedEventsSignal,
          setReducedEvents: (value) => {
            this.#reducedEvents = value;
            this.#recordingData.reducedEvents = value;
            this.#setReducedEventsSignal(value);
          },
          canExport: this.#canExport,
          actions: {
          start: () => this.startRecording(context),
          stop: () => this.stopRecording(),
          clear: () => this.clearRecording(),
          export: () => void this.exportRecording(),
        },
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

      this.pushStep(createPointerMoveStep({ context }, { event }));
    });

    context.hooks.pointerWheel.tap((event) => {
      if (!this.#recording) return;

      this.pushStep(createWheelStep({ context }, { event }));
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
        this.pushCrdtOp(
          createPatchCrdtOp({
            patch: payload as { elements: Array<Record<string, unknown>>; groups: Array<Record<string, unknown>> },
          }),
        );
      }

      originalPatch(payload);
    }) as typeof context.crdt.patch;

    context.crdt.deleteById = ((payload) => {
      if (this.#recording) {
        this.pushCrdtOp(createDeleteCrdtOp({ deleteById: payload }));
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
    this.#recordingData = createStartedRecording({
      initialDoc: context.crdt.docHandle.doc(),
      reducedEvents: this.#reducedEvents,
      now: Date.now(),
    });
    this.#recording = true;
    this.syncUi();
  }

  private stopRecording() {
    this.#recording = false;
    this.syncUi();
  }

  private clearRecording() {
    this.#recording = false;
    this.#recordingData = createEmptyRecording({ reducedEvents: this.#reducedEvents });
    this.syncUi();
  }

  private async exportRecording() {
    const runtimeWindow = window as typeof window & {
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
    };

    await saveJsonFile(
      {
        document,
        url: URL,
        showSaveFilePicker: runtimeWindow.showSaveFilePicker?.bind(runtimeWindow),
      },
      {
        fileName: `${this.#recordingData.name}.json`,
        content: JSON.stringify(this.#recordingData, null, 2),
      },
    );
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

    this.pushStep(createPointerStep({ context }, { eventName, event }));
  }

  private recordKeyEvent(eventName: "keydown" | "keyup", event: KeyboardEvent) {
    if (!this.#recording) return;

    this.pushStep(createKeyStep({ eventName, event }));
  }

  private recordDragEvent(
    context: IPluginContext,
    eventName: "dragstart" | "dragmove" | "dragend",
    event: TMouseEvent,
  ) {
    if (!this.#recording) return;

    this.pushStep(createDragStep({ context }, { eventName, event }));
  }

  private syncUi() {
    this.#setRecordingSignal(this.#recording);
    this.#setStepCount(this.#recordingData.steps.length);
    this.#setOpCount(this.#recordingData.crdtOps.length);
    this.#setReducedEventsSignal(this.#reducedEvents);
    this.#setCanExport(canExportRecording({ recording: this.#recordingData }));
  }
}
