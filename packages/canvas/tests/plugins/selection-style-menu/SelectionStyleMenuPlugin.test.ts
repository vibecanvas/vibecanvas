import { describe, expect, test, beforeEach } from "vitest";
import { SelectionStyleMenuPlugin } from "../../../src/plugins/SelectionStyleMenu.plugin";
import { Shape2dPlugin } from "../../../src/plugins/Shape2d.plugin";
import { TextPlugin } from "../../../src/plugins/Text.plugin";
import { createCanvasTestHarness, flushCanvasEffects } from "../../test-setup";

describe("SelectionStyleMenuPlugin", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("hides menu when nothing is selected", async () => {
    const harness = await createCanvasTestHarness({
      plugins: [new SelectionStyleMenuPlugin(), new Shape2dPlugin(), new TextPlugin()],
    });

    await flushCanvasEffects();
    expect(harness.stage.container().textContent ?? "").not.toContain("FILL");
    expect(harness.stage.container().textContent ?? "").not.toContain("OPACITY");
    harness.destroy();
  });

  test("shows shape controls for a selected rect", async () => {
    const harness = await createCanvasTestHarness({
      plugins: [new SelectionStyleMenuPlugin(), new Shape2dPlugin(), new TextPlugin()],
      initializeScene(context) {
        const rect = Shape2dPlugin.createRectFromElement({
          id: "rect-1",
          x: 80,
          y: 60,
          rotation: 0,
          bindings: [],
          locked: false,
          parentGroupId: null,
          zIndex: "a0",
          createdAt: 1,
          updatedAt: 1,
          data: { type: "rect", w: 120, h: 80 },
          style: {
            backgroundColor: "#ff0000",
            strokeColor: "#00ff00",
            strokeWidth: 2,
            opacity: 0.75,
          },
        });
        Shape2dPlugin.setupShapeListeners(context, rect);
        rect.draggable(true);
        context.staticForegroundLayer.add(rect);
        context.setState("selection", [rect]);
      },
    });

    await flushCanvasEffects();
    const text = harness.stage.container().textContent ?? "";
    expect(text).toContain("FILL");
    expect(text).toContain("COLOR");
    expect(text).toContain("WIDTH");
    expect(text).toContain("OPACITY");
    harness.destroy();
  });

  test("shows text controls for free text selection", async () => {
    const harness = await createCanvasTestHarness({
      plugins: [new SelectionStyleMenuPlugin(), new Shape2dPlugin(), new TextPlugin()],
      initializeScene(context) {
        const textNode = TextPlugin.createTextNode({
          id: "text-1",
          x: 20,
          y: 30,
          rotation: 0,
          bindings: [],
          locked: false,
          parentGroupId: null,
          zIndex: "a0",
          createdAt: 1,
          updatedAt: 1,
          style: {
            strokeColor: "#111111",
            opacity: 0.9,
          },
          data: {
            type: "text",
            w: 200,
            h: 24,
            text: "Hello",
            originalText: "Hello",
            fontSize: 16,
            fontFamily: "Arial",
            textAlign: "left",
            verticalAlign: "top",
            lineHeight: 1.2,
            link: null,
            containerId: null,
            autoResize: false,
          },
        });
        TextPlugin.setupShapeListeners(context, textNode);
        textNode.draggable(true);
        context.staticForegroundLayer.add(textNode);
        context.setState("selection", [textNode]);
      },
    });

    await flushCanvasEffects();
    const text = harness.stage.container().textContent ?? "";
    expect(text).toContain("COLOR");
    expect(text).toContain("FONT");
    expect(text).toContain("OPACITY");
    expect(text).not.toContain("FILL");
    expect(text).not.toContain("WIDTH");
    harness.destroy();
  });

  test("clicking a quick fill color updates selected rect", async () => {
    let currentFill = "";

    const harness = await createCanvasTestHarness({
      plugins: [new SelectionStyleMenuPlugin(), new Shape2dPlugin(), new TextPlugin()],
      initializeScene(context) {
        const rect = Shape2dPlugin.createRectFromElement({
          id: "rect-1",
          x: 80,
          y: 60,
          rotation: 0,
          bindings: [],
          locked: false,
          parentGroupId: null,
          zIndex: "a0",
          createdAt: 1,
          updatedAt: 1,
          data: { type: "rect", w: 120, h: 80 },
          style: {
            backgroundColor: "#ff0000",
            strokeColor: "#00ff00",
            strokeWidth: 2,
            opacity: 0.75,
          },
        });
        Shape2dPlugin.setupShapeListeners(context, rect);
        rect.draggable(true);
        context.staticForegroundLayer.add(rect);
        context.setState("selection", [rect]);
      },
    });

    await flushCanvasEffects();
    const greenFillButton = [...harness.stage.container().querySelectorAll("button")].find((button) => button.getAttribute("title") === "Green");
    expect(greenFillButton).toBeTruthy();
    greenFillButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushCanvasEffects();

    const rect = harness.staticForegroundLayer.findOne("#rect-1");
    currentFill = rect?.fill() as string;
    expect(currentFill).toBe("#c3e6cb");
    harness.destroy();
  });

  test("changing rect stroke color also updates attached text color", async () => {
    const harness = await createCanvasTestHarness({
      plugins: [new SelectionStyleMenuPlugin(), new Shape2dPlugin(), new TextPlugin()],
      initializeScene(context) {
        const rect = Shape2dPlugin.createRectFromElement({
          id: "rect-1",
          x: 80,
          y: 60,
          rotation: 0,
          bindings: [],
          locked: false,
          parentGroupId: null,
          zIndex: "a0",
          createdAt: 1,
          updatedAt: 1,
          data: { type: "rect", w: 140, h: 90 },
          style: {
            backgroundColor: "#ffffff",
            strokeColor: "#222222",
            strokeWidth: 2,
            opacity: 1,
          },
        });
        Shape2dPlugin.setupShapeListeners(context, rect);
        rect.draggable(true);
        context.staticForegroundLayer.add(rect);

        const textNode = TextPlugin.createTextNode({
          id: "text-1",
          x: 80,
          y: 60,
          rotation: 0,
          bindings: [],
          locked: false,
          parentGroupId: null,
          zIndex: "a1",
          createdAt: 1,
          updatedAt: 1,
          style: {
            strokeColor: "#222222",
            opacity: 1,
          },
          data: {
            type: "text",
            w: 140,
            h: 90,
            text: "Hello",
            originalText: "Hello",
            fontSize: 16,
            fontFamily: "Arial",
            textAlign: "center",
            verticalAlign: "middle",
            lineHeight: 1.2,
            link: null,
            containerId: "rect-1",
            autoResize: false,
          },
        });
        context.staticForegroundLayer.add(textNode);
        context.setState("selection", [rect]);
      },
    });

    await flushCanvasEffects();
    const greenButtons = [...harness.stage.container().querySelectorAll('button[title="Green"]')];
    expect(greenButtons.length).toBeGreaterThan(1);
    greenButtons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushCanvasEffects();

    const rect = harness.staticForegroundLayer.findOne("#rect-1");
    const text = harness.staticForegroundLayer.findOne("#text-1");
    expect(rect?.stroke()).toBe("#2f9e44");
    expect(text?.fill()).toBe("#2f9e44");
    harness.destroy();
  });
});
