import Konva from "konva";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { describe, expect, test } from "vitest";
import { fnCreateShape2dElement } from "../../../src/core/fn.shape2d";
import { createMockDocHandle, createNewCanvasHarness, flushCanvasEffects } from "../../new-test-setup";

function createRectElement(id: string) {
  return fnCreateShape2dElement({
    id,
    type: "rect",
    x: 120,
    y: 140,
    rotation: 0,
    width: 220,
    height: 120,
    createdAt: 1,
    updatedAt: 1,
    parentGroupId: null,
    zIndex: "z0001",
    style: {
      backgroundColor: "@base/300",
      strokeColor: "@base/900",
      strokeWidth: "@stroke-width/thin",
      opacity: 1,
    },
  });
}

function createLegacyAttachedTextElement(args: {
  id: string;
  containerId: string;
  text: string;
}): TElement {
  return {
    id: args.id,
    x: 120,
    y: 140,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    bindings: [],
    locked: false,
    parentGroupId: null,
    zIndex: "z0002",
    createdAt: 2,
    updatedAt: 2,
    style: {
      strokeColor: "@base/900",
      opacity: 1,
      fontSize: "@text/m",
      textAlign: "center",
      verticalAlign: "middle",
    },
    data: {
      type: "text",
      w: 220,
      h: 120,
      text: args.text,
      originalText: args.text,
      fontFamily: "Arial",
      link: null,
      containerId: args.containerId,
      autoResize: false,
    },
  } satisfies TElement;
}

async function openShapeInlineEdit(node: Konva.Shape) {
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
}

describe("shape2d inline text ownership", () => {
  test("double-click editing persists inline text onto the shape element", async () => {
    const rect = createRectElement("shape-inline-1");
    const docHandle = createMockDocHandle({
      elements: {
        [rect.id]: structuredClone(rect),
      },
    });
    const harness = await createNewCanvasHarness({ docHandle });
    const selection = harness.runtime.services.require("selection");

    const shapeNode = harness.staticForegroundLayer.findOne<Konva.Rect>(`#${rect.id}`);
    if (!(shapeNode instanceof Konva.Rect)) {
      throw new Error("Expected hydrated rect node");
    }

    await openShapeInlineEdit(shapeNode);

    const textarea = harness.stage.container().querySelector("textarea") as HTMLTextAreaElement | null;
    expect(textarea).not.toBeNull();

    textarea!.value = "Inline hello";
    textarea!.dispatchEvent(new Event("blur"));
    await flushCanvasEffects();

    const persistedRect = docHandle.doc().elements[rect.id];
    expect(persistedRect.data.type).toBe("rect");
    if (persistedRect.data.type === "rect") {
      expect(persistedRect.data.text?.text).toBe("Inline hello");
      expect(persistedRect.data.text?.fontFamily).toBe("Arial");
    }

    expect(Object.values(docHandle.doc().elements).filter((element) => element.data.type === "text")).toHaveLength(0);

    const inlineTextNode = harness.staticForegroundLayer.findOne<Konva.Text>(`#${rect.id}::inline-text`);
    expect(inlineTextNode).toBeInstanceOf(Konva.Text);
    expect(inlineTextNode?.text()).toBe("Inline hello");
    expect(selection.focusedId).toBe(rect.id);
    expect(selection.selection.map((node) => node.id())).toEqual([rect.id]);

    await harness.destroy();
  });

  test("legacy attached text elements migrate into shape2d inline text on hydrate", async () => {
    const rect = createRectElement("shape-inline-migrate-1");
    const legacyText = createLegacyAttachedTextElement({
      id: "shape-inline-migrate-text-1",
      containerId: rect.id,
      text: "Legacy hello",
    });
    const docHandle = createMockDocHandle({
      elements: {
        [rect.id]: structuredClone(rect),
        [legacyText.id]: structuredClone(legacyText),
      },
    });

    const harness = await createNewCanvasHarness({ docHandle });
    await flushCanvasEffects();

    expect(docHandle.doc().elements[legacyText.id]).toBeUndefined();
    const migratedRect = docHandle.doc().elements[rect.id];
    expect(migratedRect.data.type).toBe("rect");
    if (migratedRect.data.type === "rect") {
      expect(migratedRect.data.text?.text).toBe("Legacy hello");
      expect(migratedRect.style.fontSize).toBe("@text/m");
      expect(migratedRect.style.textAlign).toBe("center");
      expect(migratedRect.style.verticalAlign).toBe("middle");
    }

    const textNodes = harness.staticForegroundLayer.find((candidate) => candidate instanceof Konva.Text);
    expect(textNodes).toHaveLength(1);
    expect((textNodes[0] as Konva.Text).text()).toBe("Legacy hello");

    await harness.destroy();
  });
});
