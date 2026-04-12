import Konva from "konva";
import type { TElement, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { describe, expect, test } from "vitest";
import { fxToElement } from "../../../src/new-plugins/text/fx.to-element";
import { txUpdateTextNodeFromElement } from "../../../src/new-plugins/text/tx.update-text-node-from-element";
import { THEME_ID_DARK } from "../../../src/new-services/theme/enum";
import { createNewCanvasHarness, createMockDocHandle, flushCanvasEffects } from "../../new-test-setup";

function createTextElement(overrides?: Partial<TElement>): TElement {
  return {
    id: "text-1",
    x: 100,
    y: 120,
    rotation: 0,
    bindings: [],
    locked: false,
    parentGroupId: null,
    zIndex: "",
    createdAt: 1,
    updatedAt: 1,
    style: {
      opacity: 1,
      strokeColor: "#000000",
    },
    data: {
      type: "text",
      w: 200,
      h: 30,
      text: "hello",
      originalText: "hello",
      fontSize: 16,
      fontFamily: "Arial",
      textAlign: "left",
      verticalAlign: "top",
      lineHeight: 1.2,
      link: null,
      containerId: null,
      autoResize: false,
    },
    ...overrides,
  };
}

function addHydratedTextNode(harness: Awaited<ReturnType<typeof createNewCanvasHarness>>, element?: TElement) {
  const editor = harness.runtime.services.require("editor");
  const node = editor.createShapeFromTElement(element ?? createTextElement());
  if (!(node instanceof Konva.Text)) {
    throw new Error("Expected text node");
  }
  harness.staticForegroundLayer.add(node);
  harness.staticForegroundLayer.batchDraw();
  return node;
}

function simulateTransformerResize(transformer: Konva.Transformer, node: Konva.Text, args: { scaleX: number; scaleY: number }) {
  transformer.fire("transformstart", { target: node, currentTarget: transformer, evt: {} as Event });
  node.scaleX(node.scaleX() * args.scaleX);
  node.scaleY(node.scaleY() * args.scaleY);
  node.fire("transform", { target: node, currentTarget: node, evt: {} as Event });
  transformer.fire("transformend", { target: node, currentTarget: transformer, evt: {} as Event });
}

describe("new Text plugin core", () => {
  test("createShapeFromTElement hydrates a Konva.Text and editor.toElement serializes it back", async () => {
    const harness = await createNewCanvasHarness();
    const editor = harness.runtime.services.require("editor");
    const render = harness.runtime.services.require("render");

    const element = createTextElement({
      id: "text-hydrate-1",
      x: 50,
      y: 80,
      data: {
        ...createTextElement().data,
        text: "Hello world",
      },
    });

    const node = addHydratedTextNode(harness, element);
    const roundTrip = fxToElement({ render }, { node, createdAt: element.createdAt, updatedAt: element.updatedAt });
    const data = roundTrip.data as TTextData;

    expect(node.text()).toBe("Hello world");
    expect(data.text).toBe("Hello world");
    expect(data.fontSize).toBe(16);
    expect(data.textAlign).toBe("left");
    expect(editor.toElement(node)?.data.type).toBe("text");

    await harness.destroy();
  });

  test("token text color repaints on theme change and round-trips stored token", async () => {
    const harness = await createNewCanvasHarness();
    const theme = harness.runtime.services.require("theme");
    const editor = harness.runtime.services.require("editor");
    const node = addHydratedTextNode(harness, createTextElement({
      id: "text-token-1",
      style: {
        opacity: 1,
        strokeColor: "@purple/700",
      },
    }));

    expect(node.fill()).toBe("#7e22ce");
    expect(editor.toElement(node)?.style.strokeColor).toBe("@purple/700");

    theme.setTheme(THEME_ID_DARK);
    await flushCanvasEffects();

    expect(node.fill()).toBe("#c084fc");
    expect(editor.toElement(node)?.style.strokeColor).toBe("@purple/700");

    await harness.destroy();
  });

  test("committing text through edit mode patches CRDT", async () => {
    const docHandle = createMockDocHandle();
    const harness = await createNewCanvasHarness({ docHandle });

    const node = addHydratedTextNode(harness, createTextElement({ id: "crdt-text-1", data: { ...createTextElement().data, text: "" } }));

    node.fire("pointerdown", {
      target: node,
      currentTarget: node,
      evt: new MouseEvent("pointerdown", { bubbles: true }),
    });
    await flushCanvasEffects();
    node.fire("pointerdblclick", {
      target: node,
      currentTarget: node,
      evt: new MouseEvent("pointerdblclick", { bubbles: true }),
    });
    await flushCanvasEffects();

    const textarea = harness.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "Hello CRDT";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    const data = docHandle.doc().elements["crdt-text-1"].data as TTextData;
    expect(data.text).toBe("Hello CRDT");
    expect(node.text()).toBe("Hello CRDT");

    await harness.destroy();
  });

  test("multiline text commit preserves newlines", async () => {
    const docHandle = createMockDocHandle();
    const harness = await createNewCanvasHarness({ docHandle });

    const node = addHydratedTextNode(harness, createTextElement({ id: "crdt-nl-1", data: { ...createTextElement().data, text: "" } }));

    node.fire("pointerdown", {
      target: node,
      currentTarget: node,
      evt: new MouseEvent("pointerdown", { bubbles: true }),
    });
    await flushCanvasEffects();
    node.fire("pointerdblclick", {
      target: node,
      currentTarget: node,
      evt: new MouseEvent("pointerdblclick", { bubbles: true }),
    });
    await flushCanvasEffects();

    const textarea = harness.stage.container().querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "first line\nsecond line\nthird line";
    textarea.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    const data = docHandle.doc().elements["crdt-nl-1"].data as TTextData;
    expect(data.text.split("\n")).toHaveLength(3);
    expect(node.text()).toBe("first line\nsecond line\nthird line");

    await harness.destroy();
  });

  test("drag undo and redo restore text position", async () => {
    const harness = await createNewCanvasHarness();
    const history = harness.runtime.services.require("history");

    const node = addHydratedTextNode(harness, createTextElement({ id: "drag-text-1", x: 50, y: 60, data: { ...createTextElement().data, text: "drag me" } }));
    const startPos = { ...node.absolutePosition() };

    node.fire("dragstart", {
      target: node,
      currentTarget: node,
      evt: new MouseEvent("dragstart", { bubbles: true }),
    });
    node.setAbsolutePosition({ x: startPos.x + 100, y: startPos.y + 50 });
    node.fire("dragend", {
      target: node,
      currentTarget: node,
      evt: new MouseEvent("dragend", { bubbles: true }),
    });

    expect(node.absolutePosition().x).toBeCloseTo(startPos.x + 100, 1);
    expect(history.canUndo()).toBe(true);

    history.undo();
    await flushCanvasEffects();
    expect(node.absolutePosition().x).toBeCloseTo(startPos.x, 1);

    history.redo();
    await flushCanvasEffects();
    expect(node.absolutePosition().x).toBeCloseTo(startPos.x + 100, 1);

    await harness.destroy();
  });

  test("transform resize scales font size and width, then undo restores original values", async () => {
    const harness = await createNewCanvasHarness();
    const history = harness.runtime.services.require("history");
    const selection = harness.runtime.services.require("selection");

    const node = addHydratedTextNode(harness, createTextElement({
      id: "resize-text-1",
      x: 150,
      y: 150,
      data: {
        ...createTextElement().data,
        w: 200,
        h: 60,
        text: "Resize me\nTwo lines",
        fontSize: 20,
      },
    }));

    const originalFontSize = node.fontSize();
    const originalWidth = node.width();
    const originalHeight = node.height();

    selection.setSelection([node]);
    await flushCanvasEffects();

    const transformer = harness.dynamicLayer.findOne<Konva.Transformer>("Transformer");
    expect(transformer).toBeTruthy();

    simulateTransformerResize(transformer!, node, { scaleX: 2, scaleY: 2 });
    await flushCanvasEffects();

    expect(node.fontSize()).toBeCloseTo(originalFontSize * 2, 1);
    expect(node.width()).toBeCloseTo(originalWidth * 2, 1);
    expect(node.scaleX()).toBeCloseTo(1, 5);
    expect(node.scaleY()).toBeCloseTo(1, 5);

    history.undo();
    await flushCanvasEffects();

    expect(node.fontSize()).toBeCloseTo(originalFontSize, 1);
    expect(node.width()).toBeCloseTo(originalWidth, 1);
    expect(node.height()).toBeCloseTo(originalHeight, 1);

    await harness.destroy();
  });

  test("updateTextNodeFromElement restores baked dimensions and resets scale", async () => {
    const harness = await createNewCanvasHarness();
    const render = harness.runtime.services.require("render");
    const theme = harness.runtime.services.require("theme");

    const node = addHydratedTextNode(harness, createTextElement({ id: "restore-test" }));
    node.scaleX(1.5);
    node.scaleY(1.2);

    const element = fxToElement({ render }, { node, createdAt: 1, updatedAt: 2 });
    const updated = txUpdateTextNodeFromElement({ render, theme }, { element, freeTextName: "free-text" });

    expect(updated).toBe(true);
    expect(node.scaleX()).toBeCloseTo(1, 5);
    expect(node.scaleY()).toBeCloseTo(1, 5);
    expect(node.width()).toBeCloseTo(300, 5);
    expect(node.height()).toBeCloseTo(36, 5);

    await harness.destroy();
  });
});
