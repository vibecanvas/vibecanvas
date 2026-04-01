import Konva from "konva";
import { describe, expect, test, beforeEach } from "vitest";
import { SelectionStyleMenuPlugin, SelectPlugin, Shape1dPlugin, Shape2dPlugin, TextPlugin } from "../../../src/plugins";
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

    const rect = harness.staticForegroundLayer.findOne("#rect-1") as Konva.Rect | null;
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

    const rect = harness.staticForegroundLayer.findOne("#rect-1") as Konva.Rect | null;
    const text = harness.staticForegroundLayer.findOne("#text-1") as Konva.Text | null;
    expect(rect?.stroke()).toBe("#2f9e44");
    expect(text?.fill()).toBe("#2f9e44");
    harness.destroy();
  });

  test("shows line controls for a selected arrow", async () => {
    const harness = await createCanvasTestHarness({
      plugins: [new SelectionStyleMenuPlugin(), new Shape1dPlugin(), new Shape2dPlugin(), new TextPlugin()],
      initializeScene(context) {
        const arrow = Shape1dPlugin.createShapeFromElement({
          id: "arrow-1",
          x: 80,
          y: 60,
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
            strokeWidth: 4,
          },
          data: {
            type: "arrow",
            lineType: "curved",
            points: [[0, 0], [40, 30], [120, 20]],
            startBinding: null,
            endBinding: null,
            startCap: "dot",
            endCap: "arrow",
          },
        });
        Shape1dPlugin.setupShapeListeners(context, arrow);
        arrow.draggable(true);
        context.staticForegroundLayer.add(arrow);
        context.setState("selection", [arrow]);
      },
    });

    await flushCanvasEffects();
    const text = harness.stage.container().textContent ?? "";
    expect(text).toContain("COLOR");
    expect(text).toContain("WIDTH");
    expect(text).toContain("CURVE");
    expect(text).toContain("START");
    expect(text).toContain("END");
    expect(text).toContain("OPACITY");
    expect(text).not.toContain("FILL");
    harness.destroy();
  });

  test("clicking curved in style menu updates selected arrow lineType", async () => {
    const harness = await createCanvasTestHarness({
      plugins: [new SelectionStyleMenuPlugin(), new Shape1dPlugin(), new Shape2dPlugin(), new TextPlugin()],
      initializeScene(context) {
        const arrow = Shape1dPlugin.createShapeFromElement({
          id: "arrow-curve",
          x: 80,
          y: 60,
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
            strokeWidth: 4,
          },
          data: {
            type: "arrow",
            lineType: "straight",
            points: [[0, 0], [120, 20]],
            startBinding: null,
            endBinding: null,
            startCap: "none",
            endCap: "arrow",
          },
        });
        Shape1dPlugin.setupShapeListeners(context, arrow);
        arrow.draggable(true);
        context.staticForegroundLayer.add(arrow);
        context.setState("selection", [arrow]);
      },
    });

    await flushCanvasEffects();
    const curvedButton = harness.stage.container().querySelector('button[title="Curved"]');
    expect(curvedButton).toBeTruthy();
    curvedButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushCanvasEffects();

    const arrow = harness.staticForegroundLayer.findOne("#arrow-curve");
    const roundTrip = arrow ? Shape1dPlugin.toTElement(arrow as any) : null;
    expect(roundTrip?.data.type).toBe("arrow");
    if (roundTrip?.data.type === "arrow") {
      expect(roundTrip.data.lineType).toBe("curved");
    }

    harness.destroy();
  });

  test("shape1d style menu stays visible while editing points", async () => {
    const harness = await createCanvasTestHarness({
      plugins: [new SelectPlugin(), new SelectionStyleMenuPlugin(), new Shape1dPlugin(), new Shape2dPlugin(), new TextPlugin()],
      initializeScene(context) {
        const line = Shape1dPlugin.createShapeFromElement({
          id: "line-edit",
          x: 80,
          y: 60,
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
            strokeWidth: 4,
          },
          data: {
            type: "line",
            lineType: "straight",
            points: [[0, 0], [120, 20]],
            startBinding: null,
            endBinding: null,
          },
        });
        Shape1dPlugin.setupShapeListeners(context, line);
        line.draggable(true);
        context.staticForegroundLayer.add(line);
        context.setState("selection", [line]);
      },
    });

    await flushCanvasEffects();
    const line = harness.staticForegroundLayer.findOne("#line-edit");
    line?.fire("pointerdblclick", {
      target: line,
      currentTarget: line,
      evt: new PointerEvent("pointerdblclick", { bubbles: true }),
    });
    await flushCanvasEffects();

    const text = harness.stage.container().textContent ?? "";
    expect(text).toContain("CURVE");
    expect(text).toContain("COLOR");

    harness.destroy();
  });

});
