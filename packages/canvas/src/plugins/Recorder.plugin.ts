import Konva from "konva";
import type { TCanvasDoc } from "@vibecanvas/shell/automerge/index";
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

type TRecorderDom = {
  mount: HTMLDivElement;
  indicator: HTMLDivElement;
  status: HTMLDivElement;
  steps: HTMLSpanElement;
  ops: HTMLSpanElement;
  startButton: HTMLButtonElement;
  stopButton: HTMLButtonElement;
  clearButton: HTMLButtonElement;
  exportButton: HTMLButtonElement;
  reducedToggle: HTMLInputElement;
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

function createButton(label: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = "border border-border bg-card px-2 py-1 text-[11px] font-mono text-foreground transition-colors hover:bg-stone-200 dark:hover:bg-stone-800";
  return button;
}

function createRecorderDom(): TRecorderDom {
  const mount = document.createElement("div");
  mount.className = "absolute bottom-3 right-16 pointer-events-none z-50";

  const panel = document.createElement("div");
  panel.className = "pointer-events-auto min-w-[220px] border border-border bg-card/95 p-3 text-foreground shadow-md backdrop-blur";

  const header = document.createElement("div");
  header.className = "flex items-center justify-between gap-3 border-b border-border pb-2";

  const titleWrap = document.createElement("div");
  const title = document.createElement("div");
  title.className = "font-display text-sm leading-none";
  title.textContent = "Recorder";
  const status = document.createElement("div");
  status.className = "mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground";
  titleWrap.append(title, status);

  const indicator = document.createElement("div");
  indicator.className = "flex h-3 w-3 items-center justify-center border border-border bg-stone-300";

  header.append(titleWrap, indicator);

  const metrics = document.createElement("div");
  metrics.className = "mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground";
  const stepsLabel = document.createElement("span");
  stepsLabel.textContent = "Steps";
  const steps = document.createElement("span");
  steps.className = "text-right font-mono text-foreground";
  const opsLabel = document.createElement("span");
  opsLabel.textContent = "CRDT Ops";
  const ops = document.createElement("span");
  ops.className = "text-right font-mono text-foreground";
  metrics.append(stepsLabel, steps, opsLabel, ops);

  const actions = document.createElement("div");
  actions.className = "mt-3 flex flex-wrap gap-2";
  const startButton = createButton("Start");
  const stopButton = createButton("Stop");
  stopButton.className = "border border-border bg-red-500 px-2 py-1 text-[11px] font-mono text-white transition-colors hover:bg-red-600";
  const clearButton = createButton("Clear");
  const exportButton = createButton("Export");
  actions.append(startButton, stopButton, clearButton, exportButton);

  const options = document.createElement("label");
  options.className = "mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground";
  const optionsText = document.createElement("span");
  optionsText.textContent = "Reduced events";
  const reducedToggle = document.createElement("input");
  reducedToggle.type = "checkbox";
  reducedToggle.className = "h-3.5 w-3.5 accent-foreground";
  options.append(optionsText, reducedToggle);

  panel.append(header, metrics, actions, options);
  mount.append(panel);

  return {
    mount,
    indicator,
    status,
    steps,
    ops,
    startButton,
    stopButton,
    clearButton,
    exportButton,
    reducedToggle,
  };
}

export class RecorderPlugin implements IPlugin {
  #dom: TRecorderDom | null = null;
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

  apply(context: IPluginContext): void {
    this.mount(context);
    this.captureHooks(context);
    this.captureCrdt(context);
  }

  private mount(context: IPluginContext) {
    context.hooks.init.tap(() => {
      const dom = createRecorderDom();
      context.stage.container().appendChild(dom.mount);

      dom.startButton.addEventListener("click", () => {
        this.startRecording(context);
      });
      dom.stopButton.addEventListener("click", () => {
        this.stopRecording();
      });
      dom.clearButton.addEventListener("click", () => {
        this.clearRecording();
      });
      dom.exportButton.addEventListener("click", () => {
        this.exportRecording();
      });
      dom.reducedToggle.addEventListener("change", () => {
        this.#reducedEvents = dom.reducedToggle.checked;
        this.#recordingData.reducedEvents = this.#reducedEvents;
      });

      this.#dom = dom;
      this.syncUi();
    });

    context.hooks.destroy.tap(() => {
      this.#restoreCrdtPatch?.();
      this.#restoreCrdtDelete?.();
      this.#restoreNodeFire?.();
      this.#restoreCrdtPatch = null;
      this.#restoreCrdtDelete = null;
      this.#restoreNodeFire = null;
      this.#dom?.mount.remove();
      this.#dom = null;
    });
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
    if (!this.#dom) return;

    this.#dom.status.textContent = this.#recording ? "REC" : "IDLE";
    this.#dom.steps.textContent = String(this.#recordingData.steps.length);
    this.#dom.ops.textContent = String(this.#recordingData.crdtOps.length);
    this.#dom.reducedToggle.checked = this.#reducedEvents;
    this.#dom.indicator.className = this.#recording
      ? "flex h-3 w-3 items-center justify-center border border-border bg-red-500"
      : "flex h-3 w-3 items-center justify-center border border-border bg-stone-300";
    this.#dom.startButton.style.display = this.#recording ? "none" : "inline-flex";
    this.#dom.stopButton.style.display = this.#recording ? "inline-flex" : "none";
    this.#dom.exportButton.disabled = this.#recordingData.steps.length === 0 && this.#recordingData.crdtOps.length === 0;
  }
}
