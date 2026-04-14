import { describe, expect, test, vi } from "vitest";
import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { CrdtService } from "../../src/services/crdt/CrdtService";
import { createMockDocHandle } from "../test-setup";

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

describe("CrdtService", () => {
  test("patch inserts and deeply updates elements and groups", () => {
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

    expect(docHandle.doc().elements.e1.x).toBe(99);
    expect(docHandle.doc().elements.e1.data.text).toBe("next");
    expect(docHandle.doc().elements.e1.style.opacity).toBe(0.5);
    expect(docHandle.doc().elements.e2.x).toBe(300);
    expect(docHandle.doc().groups.g1.zIndex).toBe("z00000009");
    expect(docHandle.doc().groups.g2.id).toBe("g2");
  });

  test("deleteById removes targeted entities", () => {
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

  test("start and stop subscribe to doc handle events and emit change", () => {
    const docHandle = createMockDocHandle();
    const onSpy = vi.spyOn(docHandle, "on");
    const offSpy = vi.spyOn(docHandle, "off");
    const service = new CrdtService({ docHandle });
    const changeSpy = vi.fn();
    service.hooks.change.tap(changeSpy);

    service.start();
    expect(service.started).toBe(true);
    expect(onSpy).toHaveBeenCalled();

    (docHandle as typeof docHandle & { __emitChange: () => void }).__emitChange();
    expect(changeSpy).toHaveBeenCalledTimes(1);

    service.stop();
    expect(service.started).toBe(false);
    expect(offSpy).toHaveBeenCalled();
  });
});
