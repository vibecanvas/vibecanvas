import { afterEach, describe, expect, test, vi } from "vitest";
import Konva from "konva";
import { EventListenerPlugin } from "../../src/plugins/EventListener.plugin";
import type { IPluginContext } from "../../src/plugins/interface";
import { RecorderPlugin } from "../../src/plugins/Recorder.plugin";
import { createCanvasTestHarness } from "../test-setup";

describe("RecorderPlugin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("mounts recorder UI, defaults to reduced events, and captures filtered events plus CRDT ops", async () => {
    let context: IPluginContext | null = null;
    let exportedBlob: Blob | null = null;
    let dragNode: Konva.Rect | null = null;

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => {
        exportedBlob = blob;
        return "blob:test-recording";
      }),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const harness = await createCanvasTestHarness({
      plugins: [new EventListenerPlugin(), new RecorderPlugin()],
      initializeScene: (pluginContext) => {
        context = pluginContext;
        dragNode = new Konva.Rect({ id: "drag-node", x: 100, y: 100, width: 40, height: 40, draggable: true });
        pluginContext.staticForegroundLayer.add(dragNode);
      },
    });

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

    context?.hooks.pointerMove.call({
      evt: { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false },
      target: { id: () => null },
    } as any);
    expect(readPanelText()).toContain("Steps0CRDTOps0");

    context?.hooks.pointerDown.call({
      evt: { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false },
      target: { id: () => null },
    } as any);
    context?.hooks.pointerMove.call({
      evt: { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false },
      target: { id: () => null },
    } as any);
    context?.hooks.pointerUp.call({
      evt: { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false },
      target: { id: () => null },
    } as any);

    expect(readPanelText()).toContain("Steps3CRDTOps0");

    reducedToggle!.click();
    expect(reducedToggle?.checked).toBe(false);

    context?.hooks.pointerMove.call({
      evt: { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false },
      target: { id: () => null },
    } as any);

    expect(readPanelText()).toContain("Steps4CRDTOps0");

    dragNode!.fire("dragstart", {
      target: dragNode,
      currentTarget: dragNode,
      evt: new MouseEvent("dragstart", { bubbles: true }),
    });
    dragNode!.fire("dragmove", {
      target: dragNode,
      currentTarget: dragNode,
      evt: new MouseEvent("dragmove", { bubbles: true }),
    });
    dragNode!.fire("dragend", {
      target: dragNode,
      currentTarget: dragNode,
      evt: new MouseEvent("dragend", { bubbles: true }),
    });

    expect(readPanelText()).toContain("Steps7CRDTOps0");

    harness.stage.container().dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    context?.crdt.deleteById({ groupIds: ["missing-group"] });

    expect(readPanelText()).toContain("Steps8CRDTOps1");
    expect(exportButton?.disabled).toBe(false);

    stopButton?.click();
    expect(readPanelText()).toContain("RecorderIDLE");

    harness.stage.container().dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
    context?.crdt.deleteById({ groupIds: ["missing-group-2"] });
    expect(readPanelText()).toContain("Steps8CRDTOps1");

    exportButton?.click();

    expect(exportedBlob).toBeTruthy();
    expect((exportedBlob as { size?: number }).size).toBeGreaterThan(0);

    clearButton?.click();
    expect(readPanelText()).toContain("RecorderIDLE");
    expect(readPanelText()).toContain("Steps0CRDTOps0");
    expect(exportButton?.disabled).toBe(true);

    harness.destroy();
  });
});
