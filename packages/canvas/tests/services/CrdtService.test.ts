import { describe, expect, test, vi } from "vitest";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc, TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { CrdtService } from "../../src/services/crdt/CrdtService";

function createElement(id: string): TElement {
  return {
    id,
    x: 10,
    y: 20,
    rotation: 0,
    zIndex: "z00000000",
    parentGroupId: null,
    bindings: [],
    locked: false,
    createdAt: 1,
    updatedAt: 2,
    data: {
      type: "text",
      w: 100,
      h: 40,
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
    style: {
      opacity: 1,
      strokeColor: "#000",
    },
  };
}

function createGroup(id: string): TGroup {
  return {
    id,
    parentGroupId: null,
    zIndex: "z00000000",
    locked: false,
    createdAt: 1,
  };
}

function createMockDocHandle(overrides?: Partial<TCanvasDoc>): DocHandle<TCanvasDoc> {
  const docState: TCanvasDoc = {
    id: "test-doc",
    name: "test-doc",
    elements: {},
    groups: {},
    ...overrides,
  };
  const listeners = new Map<string, Set<(payload: unknown) => void>>();

  const docHandle = {
    doc: () => docState,
    change: (callback: (doc: TCanvasDoc) => void) => {
      callback(docState);
    },
    on: (event: string, callback: (payload: unknown) => void) => {
      const set = listeners.get(event) ?? new Set();
      set.add(callback);
      listeners.set(event, set);
      return docHandle;
    },
    off: (event: string, callback: (payload: unknown) => void) => {
      listeners.get(event)?.delete(callback);
      return docHandle;
    },
  };

  return docHandle as DocHandle<TCanvasDoc>;
}

describe("CrdtService", () => {
  test("patch inserts entities and deeply updates nested fields", () => {
    const docHandle = createMockDocHandle({
      elements: {
        e1: createElement("e1"),
      },
      groups: {
        g1: createGroup("g1"),
      },
    });
    const service = new CrdtService({ docHandle });

    service.patch({
      elements: [
        { id: "e1", x: 99, data: { text: "next" }, style: { opacity: 0.5 } },
        { ...createElement("e2"), x: 300 },
      ],
      groups: [
        { id: "g1", zIndex: "z00000009" },
        createGroup("g2"),
      ],
    });

    expect(service.doc()).toBe(docHandle.doc());
    expect(docHandle.doc().elements.e1.x).toBe(99);
    expect(docHandle.doc().elements.e1.data.text).toBe("next");
    expect(docHandle.doc().elements.e1.style.opacity).toBe(0.5);
    expect(docHandle.doc().elements.e2.x).toBe(300);
    expect(docHandle.doc().groups.g1.zIndex).toBe("z00000009");
    expect(docHandle.doc().groups.g2.id).toBe("g2");
  });

  test("patch replaces array fields and preserves unrelated nested object keys", () => {
    const docHandle = createMockDocHandle({
      elements: {
        e1: {
          ...createElement("e1"),
          bindings: [{ id: "binding-1" } as TElement["bindings"][number]],
          style: {
            opacity: 1,
            strokeColor: "#000",
            fillColor: "#fff",
          },
        },
      },
      groups: {},
    });
    const service = new CrdtService({ docHandle });

    service.patch({
      elements: [
        {
          id: "e1",
          bindings: [],
          style: { opacity: 0.25 },
        },
      ],
      groups: [],
    });

    expect(docHandle.doc().elements.e1.bindings).toEqual([]);
    expect(docHandle.doc().elements.e1.style.opacity).toBe(0.25);
    expect(docHandle.doc().elements.e1.style.strokeColor).toBe("#000");
    expect(docHandle.doc().elements.e1.style.fillColor).toBe("#fff");
  });

  test("deleteById removes targeted entities only", () => {
    const docHandle = createMockDocHandle({
      elements: {
        e1: createElement("e1"),
        e2: createElement("e2"),
      },
      groups: {
        g1: createGroup("g1"),
      },
    });
    const service = new CrdtService({ docHandle });

    service.deleteById({ elementIds: ["e1"], groupIds: ["g1"] });

    expect(docHandle.doc().elements.e1).toBeUndefined();
    expect(docHandle.doc().elements.e2).toBeTruthy();
    expect(docHandle.doc().groups.g1).toBeUndefined();
  });

  test("consumePendingLocalChangeEvent stays false after local patch and delete complete", () => {
    const docHandle = createMockDocHandle();
    const service = new CrdtService({ docHandle });

    expect(service.consumePendingLocalChangeEvent()).toBe(false);

    service.patch({
      elements: [createElement("e1")],
      groups: [],
    });
    expect(service.consumePendingLocalChangeEvent()).toBe(false);

    service.deleteById({ elementIds: ["e1"] });
    expect(service.consumePendingLocalChangeEvent()).toBe(false);
  });

  test("start and stop subscribe to doc handle events and emit change for change and delete", () => {
    const docHandle = createMockDocHandle();
    const onSpy = vi.spyOn(docHandle, "on");
    const offSpy = vi.spyOn(docHandle, "off");
    const service = new CrdtService({ docHandle });
    const changeSpy = vi.fn();
    service.hooks.change.tap(changeSpy);

    service.start();
    service.start();

    expect(service.started).toBe(true);
    expect(onSpy).toHaveBeenCalledTimes(3);
    expect(onSpy).toHaveBeenNthCalledWith(1, "change", expect.any(Function));
    expect(onSpy).toHaveBeenNthCalledWith(2, "delete", expect.any(Function));
    expect(onSpy).toHaveBeenNthCalledWith(3, "ephemeral-message", expect.any(Function));

    const changeListener = onSpy.mock.calls.find(([event]) => event === "change")?.[1] as (() => void) | undefined;
    const deleteListener = onSpy.mock.calls.find(([event]) => event === "delete")?.[1] as (() => void) | undefined;
    expect(changeListener).toBeTypeOf("function");
    expect(deleteListener).toBeTypeOf("function");

    changeListener?.();
    deleteListener?.();
    expect(changeSpy).toHaveBeenCalledTimes(2);

    service.stop();
    service.stop();
    expect(service.started).toBe(false);
    expect(offSpy).toHaveBeenCalledTimes(3);
    expect(offSpy).toHaveBeenNthCalledWith(1, "change", expect.any(Function));
    expect(offSpy).toHaveBeenNthCalledWith(2, "delete", expect.any(Function));
    expect(offSpy).toHaveBeenNthCalledWith(3, "ephemeral-message", expect.any(Function));
  });
});
