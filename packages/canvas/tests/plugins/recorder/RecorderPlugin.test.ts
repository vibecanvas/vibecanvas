import { afterEach, describe, expect, test, vi } from "vitest";
import Konva from "konva";
import { EventListenerPlugin } from "../../../src/plugins/EventListener.plugin";
import type { IPluginContext } from "../../../src/plugins/interface";
import { RecorderPlugin } from "../../../src/plugins/Recorder.plugin";
import { createCanvasTestHarness, createStagePointerEvent } from "../../test-setup";

describe("RecorderPlugin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("mounts recorder UI, defaults to reduced events, and captures filtered events plus CRDT ops", async () => {
    let context: IPluginContext | null = null;
    let savedText = "";
    let dragNode: Konva.Rect | null = null;
    const createWritable = vi.fn(async () => ({
      write: vi.fn(async (content: string) => {
        savedText = content;
      }),
      close: vi.fn(async () => {}),
    }));
    const showSaveFilePicker = vi.fn(async () => ({ createWritable }));

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:test-recording"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("showSaveFilePicker", showSaveFilePicker);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const harness = await createCanvasTestHarness({
      plugins: [new EventListenerPlugin(), new RecorderPlugin()],
      initializeScene: (pluginContext) => {
        context = pluginContext;
        dragNode = new Konva.Rect({ id: "drag-node", x: 100, y: 100, width: 40, height: 40, draggable: true });
        pluginContext.staticForegroundLayer.add(dragNode);
      },
    });

    if (!context) {
      throw new Error("Expected recorder test context");
    }
    const pluginContext: IPluginContext = context;

    const recorder = Array.from(document.querySelectorAll("div")).find((node) => node.textContent?.includes("Recorder"));
    expect(recorder).toBeTruthy();
    const readPanelText = () => recorder?.textContent?.replace(/\s+/g, "") ?? "";

    const getButton = (label: string) =>
      Array.from(recorder!.querySelectorAll("button")).find((button) => button.textContent === label) as HTMLButtonElement | undefined;

    const startButton = getButton("Start");
    const stopButton = getButton("Stop");
    const clearButton = getButton("Clear");
    const exportButton = getButton("Export");
    const reducedToggle = recorder?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;

    expect(startButton).toBeTruthy();
    expect(stopButton).toBeTruthy();
    expect(clearButton).toBeTruthy();
    expect(exportButton).toBeTruthy();
    expect(reducedToggle).toBeTruthy();
    expect(reducedToggle?.checked).toBe(true);
    expect(readPanelText()).toContain("RecorderIDLE");
    expect(exportButton?.disabled).toBe(true);

    startButton?.click();
    expect(readPanelText()).toContain("RecorderREC");

    const registerPointer = (type: string, x = 200, y = 150) => {
      return createStagePointerEvent(harness.stage, { type, x, y });
    };

    pluginContext.hooks.pointerMove.call({
      evt: registerPointer("pointermove"),
      target: { id: () => null },
    } as any);
    expect(readPanelText()).toContain("Steps0CRDTOps0");

    pluginContext.hooks.pointerDown.call({
      evt: registerPointer("pointerdown", 210, 155),
      target: { id: () => null },
    } as any);
    pluginContext.hooks.pointerMove.call({
      evt: registerPointer("pointermove", 220, 160),
      target: { id: () => null },
    } as any);
    pluginContext.hooks.pointerUp.call({
      evt: registerPointer("pointerup", 220, 160),
      target: { id: () => null },
    } as any);

    expect(readPanelText()).toContain("Steps3CRDTOps0");

    reducedToggle!.click();
    expect(reducedToggle?.checked).toBe(false);

    pluginContext.hooks.pointerMove.call({
      evt: registerPointer("pointermove", 230, 165),
      target: { id: () => null },
    } as any);

    expect(readPanelText()).toContain("Steps4CRDTOps0");

    dragNode!.fire("dragstart", {
      target: dragNode,
      currentTarget: dragNode,
      evt: registerPointer("dragstart", 240, 170),
    });
    dragNode!.fire("dragmove", {
      target: dragNode,
      currentTarget: dragNode,
      evt: registerPointer("dragmove", 250, 180),
    });
    dragNode!.fire("dragend", {
      target: dragNode,
      currentTarget: dragNode,
      evt: registerPointer("dragend", 260, 190),
    });

    expect(readPanelText()).toContain("Steps7CRDTOps0");

    harness.stage.container().dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    pluginContext.crdt.deleteById({ groupIds: ["missing-group"] });

    expect(readPanelText()).toContain("Steps8CRDTOps1");
    expect(exportButton?.disabled).toBe(false);

    stopButton?.click();
    expect(readPanelText()).toContain("RecorderIDLE");

    harness.stage.container().dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
    pluginContext.crdt.deleteById({ groupIds: ["missing-group-2"] });
    expect(readPanelText()).toContain("Steps8CRDTOps1");

    exportButton?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(showSaveFilePicker).toHaveBeenCalledTimes(1);
    expect(createWritable).toHaveBeenCalledTimes(1);
    expect(savedText.length).toBeGreaterThan(0);
    expect(savedText).toContain('"reducedEvents": false');

    clearButton?.click();
    expect(readPanelText()).toContain("RecorderIDLE");
    expect(readPanelText()).toContain("Steps0CRDTOps0");
    expect(exportButton?.disabled).toBe(true);

    harness.destroy();
  });
});
