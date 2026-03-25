import { Repo, type DocHandle, type PeerId } from "@automerge/automerge-repo";
import type { TCanvasDoc, TElement, TGroup, TImageData } from "@vibecanvas/shell/automerge/index";
import { describe, expect, test } from "vitest";
import { Crdt } from "../../../src/services/canvas/Crdt";

async function createLocalHandle(overrides?: Partial<TCanvasDoc>): Promise<DocHandle<TCanvasDoc>> {
  const repo = new Repo({
    peerId: `test-${crypto.randomUUID()}` as PeerId,
  });

  const handle = repo.create<TCanvasDoc>({
    id: "canvas-1",
    name: "Canvas 1",
    elements: {},
    groups: {},
    ...overrides,
  });

  await handle.whenReady();

  return handle;
}

function createImageElement(overrides?: Partial<TElement>): TElement {
  return {
    id: "element-1",
    x: 10,
    y: 20,
    angle: 0,
    zIndex: "a0",
    parentGroupId: null,
    bindings: [
      {
        targetId: "target-1",
        anchor: { x: 0.25, y: 0.5 },
      },
    ],
    locked: false,
    createdAt: 1,
    updatedAt: 2,
    data: {
      type: "image",
      url: "https://example.com/image.png",
      base64: null,
      w: 100,
      h: 80,
      crop: {
        x: 0,
        y: 0,
        width: 100,
        height: 80,
        naturalWidth: 100,
        naturalHeight: 80,
      },
    },
    style: {
      backgroundColor: "#fff",
      strokeColor: "#111",
      strokeWidth: 2,
      opacity: 0.8,
    },
    ...overrides,
  };
}

function createGroup(overrides?: Partial<TGroup>): TGroup {
  return {
    id: "group-1",
    name: "Group 1",
    color: "#abc",
    parentGroupId: null,
    locked: false,
    createdAt: 1,
    ...overrides,
  };
}

function requireImageData(element: TElement): TImageData {
  expect(element.data.type).toBe("image");
  return element.data as TImageData;
}

describe("Crdt", () => {
  test("patch inserts a missing element", async () => {
    const handle = await createLocalHandle();
    const crdt = new Crdt(handle);
    const element = createImageElement();

    crdt.patch({ elements: [element], groups: [] });

    const doc = handle.doc();
    expect(doc).toBeTruthy();
    expect(doc!.elements[element.id]).toEqual(element);
  });

  test("patch applies minimal nested updates without overwriting siblings", async () => {
    const existing = createImageElement();
    const handle = await createLocalHandle({
      elements: {
        [existing.id]: existing,
      },
    });
    const crdt = new Crdt(handle);

    crdt.patch({
      elements: [
        {
          id: existing.id,
          x: 99,
          style: {
            strokeWidth: 6,
          },
          bindings: [
            {
              anchor: {
                x: 0.75,
              },
            },
          ],
          data: {
            crop: {
              width: 55,
            },
          },
        },
      ],
      groups: [],
    });

    const doc = await handle.doc();
    expect(doc).toBeTruthy();

    const updated = doc!.elements[existing.id];
    const updatedImageData = requireImageData(updated);
    const existingImageData = requireImageData(existing);

    expect(updated.x).toBe(99);
    expect(updated.y).toBe(existing.y);
    expect(updated.style.strokeWidth).toBe(6);
    expect(updated.style.strokeColor).toBe(existing.style.strokeColor);
    expect(updatedImageData.crop.width).toBe(55);
    expect(updatedImageData.crop.height).toBe(existingImageData.crop.height);
    expect(updated.bindings[0].targetId).toBe(existing.bindings[0].targetId);
    expect(updated.bindings[0].anchor.x).toBe(0.75);
    expect(updated.bindings[0].anchor.y).toBe(existing.bindings[0].anchor.y);
    expect(updated.id).toBe(existing.id);
  });

  test("patch does not delete omitted elements or groups", async () => {
    const elementA = createImageElement({ id: "element-a" });
    const elementB = createImageElement({ id: "element-b", x: 200 });
    const groupA = createGroup({ id: "group-a" });
    const handle = await createLocalHandle({
      elements: {
        [elementA.id]: elementA,
        [elementB.id]: elementB,
      },
      groups: {
        [groupA.id]: groupA,
      },
    });
    const crdt = new Crdt(handle);

    crdt.patch({
      elements: [
        {
          id: elementA.id,
          y: 500,
        },
      ],
      groups: [],
    });

    const doc = await handle.doc();
    expect(doc).toBeTruthy();
    expect(doc!.elements[elementA.id].y).toBe(500);
    expect(doc!.elements[elementB.id]).toEqual(elementB);
    expect(doc!.groups[groupA.id]).toEqual(groupA);
  });

  test("patch inserts and updates groups", async () => {
    const existingGroup = createGroup();
    const newGroup = createGroup({ id: "group-2", name: "Group 2" });
    const handle = await createLocalHandle({
      groups: {
        [existingGroup.id]: existingGroup,
      },
    });
    const crdt = new Crdt(handle);

    crdt.patch({
      elements: [],
      groups: [
        {
          id: existingGroup.id,
          color: null,
          locked: true,
        },
        newGroup,
      ],
    });

    const doc = await handle.doc();
    expect(doc).toBeTruthy();
    expect(doc!.groups[existingGroup.id].name).toBe(existingGroup.name);
    expect(doc!.groups[existingGroup.id].color).toBeNull();
    expect(doc!.groups[existingGroup.id].locked).toBe(true);
    expect(doc!.groups[newGroup.id]).toEqual(newGroup);
  });

  test("deleteById removes only requested items", async () => {
    const elementA = createImageElement({ id: "element-a" });
    const elementB = createImageElement({ id: "element-b" });
    const groupA = createGroup({ id: "group-a" });
    const groupB = createGroup({ id: "group-b" });
    const handle = await createLocalHandle({
      elements: {
        [elementA.id]: elementA,
        [elementB.id]: elementB,
      },
      groups: {
        [groupA.id]: groupA,
        [groupB.id]: groupB,
      },
    });
    const crdt = new Crdt(handle);

    crdt.deleteById({ elementIds: [elementA.id], groupIds: [groupB.id] });

    const doc = await handle.doc();
    expect(doc).toBeTruthy();
    expect(doc!.elements[elementA.id]).toBeUndefined();
    expect(doc!.elements[elementB.id]).toEqual(elementB);
    expect(doc!.groups[groupA.id]).toEqual(groupA);
    expect(doc!.groups[groupB.id]).toBeUndefined();
  });
});
