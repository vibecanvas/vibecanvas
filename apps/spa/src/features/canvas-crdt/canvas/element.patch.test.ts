import { describe, test, expect, beforeAll, beforeEach, vi } from "vitest"
import type { TCanvasDoc, TElement } from "@vibecanvas/shell"
import type { Patch } from "@automerge/automerge/slim"
import type { Canvas } from "./canvas"
import type { AElement } from "../renderables/element.abstract"

// Mock all problematic modules - vitest hoists these
vi.mock("@/components/ui/Toast", () => ({
  showToast: vi.fn(),
  showErrorToast: vi.fn(),
  Toaster: vi.fn(),
}))

vi.mock("@/store", () => ({
  store: {
    toolbarSlice: { activeTool: 'select' },
    drawingSlice: { selectedIds: [], mousePositionWorldSpace: { x: 0, y: 0 } },
  },
  setStore: vi.fn(),
  activeCanvasId: vi.fn(() => null),
  setActiveCanvasId: vi.fn(),
}))

vi.mock("pixi.js", () => ({
  Application: vi.fn().mockImplementation(() => ({
    stage: { addChild: vi.fn(), on: vi.fn(), eventMode: 'static', interactiveChildren: true, hitArea: null, x: 0, y: 0, scale: { x: 1, y: 1 } },
    canvas: { style: { touchAction: 'none' } },
    start: vi.fn(),
    init: vi.fn().mockResolvedValue(undefined),
  })),
  Container: vi.fn().mockImplementation(() => ({
    addChild: vi.fn(),
    destroy: vi.fn(),
    x: 0,
    y: 0,
    rotation: 0,
    eventMode: 'static',
    cursor: 'default',
    label: '',
    getLocalBounds: vi.fn(() => ({ x: 0, y: 0, width: 100, height: 100 })),
  })),
  Graphics: vi.fn().mockImplementation(() => ({
    rect: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    roundRect: vi.fn().mockReturnThis(),
  })),
  Rectangle: vi.fn().mockImplementation((x = 0, y = 0, width = 0, height = 0) => ({ x, y, width, height })),
  Point: vi.fn().mockImplementation((x = 0, y = 0) => ({ x, y, clone: vi.fn(() => ({ x, y })) })),
  RenderLayer: vi.fn().mockImplementation(() => ({
    attach: vi.fn(),
    detach: vi.fn(),
    sortableChildren: false,
  })),
  Bounds: vi.fn().mockImplementation(() => ({ x: 0, y: 0, width: 0, height: 0 })),
}))

vi.mock("@pixi/devtools", () => ({
  initDevtools: vi.fn(),
}))

vi.mock("@solid-primitives/scheduled", () => ({
  throttle: vi.fn((fn: any) => fn),
  debounce: vi.fn((fn: any) => fn),
}))

vi.mock("@automerge/automerge-repo", () => ({
  DocHandle: vi.fn(),
  Repo: vi.fn(),
}))

vi.mock("@automerge/automerge", () => ({
  diff: vi.fn(() => []),
}))

vi.mock("../renderables/elements/chat/chat.class", () => ({
  ChatElement: class MockChatElement {
    id: string
    element: any
    container: { x: number; y: number; rotation: number }
    destroy = vi.fn()
    redraw = vi.fn()

    constructor(element: any, _canvas: any) {
      this.id = element.id
      this.element = element
      this.container = {
        x: element.x,
        y: element.y,
        rotation: element.angle,
      }
    }
  }
}))

function createElementClassMock() {
  return class MockElement {
    id: string
    element: any
    container: { x: number; y: number; rotation: number }
    destroy = vi.fn()
    redraw = vi.fn()

    constructor(element: any, _canvas: any) {
      this.id = element.id
      this.element = element
      const w = element.data?.w ?? 0
      const h = element.data?.h ?? 0
      this.container = {
        x: element.x + w / 2,
        y: element.y + h / 2,
        rotation: element.angle,
      }
    }
  }
}

vi.mock("../renderables/elements/arrow/arrow.class", () => ({ ArrowElement: createElementClassMock() }))
vi.mock("../renderables/elements/diamond/diamond.class", () => ({ DiamondElement: createElementClassMock() }))
vi.mock("../renderables/elements/ellipse/ellipse.class", () => ({ EllipseElement: createElementClassMock() }))
vi.mock("../renderables/elements/filetree/filetree.class", () => ({ FiletreeElement: createElementClassMock() }))
vi.mock("../renderables/elements/image/image.class", () => ({ ImageElement: createElementClassMock() }))
vi.mock("../renderables/elements/line/line.class", () => ({ LineElement: createElementClassMock() }))
vi.mock("../renderables/elements/pen/pen.class", () => ({ PenElement: createElementClassMock() }))
vi.mock("../renderables/elements/text/text.class", () => ({ TextElement: createElementClassMock() }))

// Mock RectElement with a proper class
vi.mock("../renderables/elements/rect/rect.class", () => ({
  RectElement: class MockRectElement {
    id: string
    element: any
    container: { x: number; y: number; rotation: number }
    destroy = vi.fn()
    redraw = vi.fn()

    constructor(element: any, _canvas: any) {
      this.id = element.id
      this.element = element
      const w = element.data?.w ?? 0
      const h = element.data?.h ?? 0
      this.container = {
        x: element.x + w / 2,
        y: element.y + h / 2,
        rotation: element.angle,
      }
    }
  }
}))

// Import after mocks
let applyPatches: (canvas: Canvas, doc: TCanvasDoc, patches: Patch[]) => void

beforeAll(async () => {
  ({ applyPatches } = await import("./element.patch"))
})

// Helper to create mock renderable
function createMockRenderable(element: TElement): AElement {
  return {
    id: element.id,
    element,
    container: {
      x: element.x + ('w' in element.data ? (element.data as any).w / 2 : 0),
      y: element.y + ('h' in element.data ? (element.data as any).h / 2 : 0),
      rotation: element.angle,
    },
    destroy: vi.fn(),
    redraw: vi.fn(),
  } as unknown as AElement
}

// Helper to create mock canvas
function createMockCanvas(): Canvas {
  return {
    elements: new Map<string, AElement>(),
    bottomLayer: {
      attach: vi.fn(),
    },
    app: {
      stage: {
        addChild: vi.fn(),
      },
    },
  } as unknown as Canvas
}

// Helper to create a rect element
function createRectElement(id: string, overrides: Partial<TElement> = {}): TElement {
  const base = {
    id,
    x: 100,
    y: 100,
    angle: 0,
    zIndex: 'a',
    groupId: null,
    bindings: [],
    locked: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    data: {
      type: 'rect' as const,
      w: 200,
      h: 150,
      radius: 0,
    },
    style: {
      backgroundColor: '#1971c2',
      strokeColor: '#1864ab',
      strokeWidth: 2,
      opacity: 1,
    },
  }
  return { ...base, ...overrides } as TElement
}

// Helper to create mock doc
function createMockDoc(elements: Record<string, TElement> = {}): TCanvasDoc {
  return {
    id: 'test-canvas',
    name: 'Test Canvas',
    elements,
    groups: {},
  }
}

describe("applyPatches", () => {
  let canvas: Canvas
  let doc: TCanvasDoc

  beforeEach(() => {
    canvas = createMockCanvas()
    vi.clearAllMocks()
  })

  describe("create element", () => {
    test("creates element when patch contains put {} on elements path", () => {
      const elementId = "69663e65-23eb-4ba7-ad94-04b1e382e586"
      const element = createRectElement(elementId, {
        x: 522.331456058969,
        y: -130.56298188820477,
        data: { type: 'rect', w: 231.63007196133526, h: 245.47640292969066, radius: 0 },
      })
      doc = createMockDoc({ [elementId]: element })

      const patches: Patch[] = [
        { action: "put", path: ["elements", elementId], value: {} },
        { action: "put", path: ["elements", elementId, "id"], value: "" },
        { action: "put", path: ["elements", elementId, "x"], value: 522.331456058969 },
        { action: "put", path: ["elements", elementId, "y"], value: -130.56298188820477 },
        { action: "put", path: ["elements", elementId, "data"], value: {} },
        { action: "put", path: ["elements", elementId, "data", "type"], value: "rect" },
        { action: "put", path: ["elements", elementId, "data", "w"], value: 231.63007196133526 },
        { action: "put", path: ["elements", elementId, "data", "h"], value: 245.47640292969066 },
      ]

      applyPatches(canvas, doc, patches)

      expect(canvas.elements.has(elementId)).toBe(true)
      expect(canvas.bottomLayer.attach).toHaveBeenCalledTimes(1)
      expect(canvas.app.stage.addChild).toHaveBeenCalledTimes(1)
    })

    test("does not create duplicate element if already exists", () => {
      const elementId = "test-element-id"
      const element = createRectElement(elementId)
      doc = createMockDoc({ [elementId]: element })

      const existingRenderable = createMockRenderable(element)
      canvas.elements.set(elementId, existingRenderable)

      const patches: Patch[] = [
        { action: "put", path: ["elements", elementId], value: {} },
      ]

      applyPatches(canvas, doc, patches)

      expect(canvas.elements.size).toBe(1)
      expect(canvas.bottomLayer.attach).not.toHaveBeenCalled()
    })
  })

  describe("delete element", () => {
    test("deletes element when patch contains del on elements path", () => {
      const elementId1 = "4eda6ce2-21c4-4922-9d7c-8b017d120dea"
      const elementId2 = "10299d32-3a99-4d78-9b8f-4ad456d755c0"

      doc = createMockDoc({})

      const element1 = createRectElement(elementId1)
      const element2 = createRectElement(elementId2)
      const renderable1 = createMockRenderable(element1)
      const renderable2 = createMockRenderable(element2)
      canvas.elements.set(elementId1, renderable1)
      canvas.elements.set(elementId2, renderable2)

      const patches: Patch[] = [
        { action: "del", path: ["elements", elementId1] },
        { action: "del", path: ["elements", elementId2] },
      ]

      applyPatches(canvas, doc, patches)

      expect(canvas.elements.has(elementId1)).toBe(false)
      expect(canvas.elements.has(elementId2)).toBe(false)
      expect(renderable1.destroy).toHaveBeenCalledTimes(1)
      expect(renderable2.destroy).toHaveBeenCalledTimes(1)
    })

    test("handles delete of non-existent element gracefully", () => {
      doc = createMockDoc({})
      const patches: Patch[] = [
        { action: "del", path: ["elements", "non-existent-id"] },
      ]

      expect(() => applyPatches(canvas, doc, patches)).not.toThrow()
    })
  })

  describe("update element - move", () => {
    test("updates element position when x changes", () => {
      const elementId = "4eda6ce2-21c4-4922-9d7c-8b017d120dea"
      const newX = 862.5275695690665
      const w = 200
      const h = 150
      const element = createRectElement(elementId, {
        x: newX,
        data: { type: 'rect', w, h, radius: 0 }
      })
      doc = createMockDoc({ [elementId]: element })

      const renderable = createMockRenderable(createRectElement(elementId, { x: 100 }))
      canvas.elements.set(elementId, renderable)

      const patches: Patch[] = [
        { action: "put", path: ["elements", elementId, "x"], value: newX },
      ]

      applyPatches(canvas, doc, patches)

      expect(renderable.element).toBe(element)
      expect(renderable.container.x).toBe(newX + w / 2)
      expect(renderable.redraw).toHaveBeenCalledTimes(1)
    })
  })

  describe("update element - rotate", () => {
    test("updates element rotation when angle changes", () => {
      const elementId = "4eda6ce2-21c4-4922-9d7c-8b017d120dea"
      const newAngle = 0.9586814628718552
      const element = createRectElement(elementId, { angle: newAngle })
      doc = createMockDoc({ [elementId]: element })

      const renderable = createMockRenderable(createRectElement(elementId, { angle: 0 }))
      canvas.elements.set(elementId, renderable)

      const patches: Patch[] = [
        { action: "put", path: ["elements", elementId, "angle"], value: newAngle },
      ]

      applyPatches(canvas, doc, patches)

      expect(renderable.container.rotation).toBe(newAngle)
      expect(renderable.redraw).toHaveBeenCalledTimes(1)
    })
  })

  describe("update element - resize", () => {
    test("updates element dimensions when data.w and data.h change", () => {
      const elementId = "4eda6ce2-21c4-4922-9d7c-8b017d120dea"
      const newX = 940.2083129414804
      const newY = -474.76330070825054
      const newW = 527.1618795551019
      const newH = 456.0068857788664

      const element = createRectElement(elementId, {
        x: newX,
        y: newY,
        data: { type: 'rect', w: newW, h: newH, radius: 0 },
      })
      doc = createMockDoc({ [elementId]: element })

      const renderable = createMockRenderable(createRectElement(elementId))
      canvas.elements.set(elementId, renderable)

      const patches: Patch[] = [
        { action: "put", path: ["elements", elementId, "x"], value: newX },
        { action: "put", path: ["elements", elementId, "y"], value: newY },
        { action: "put", path: ["elements", elementId, "data"], value: {} },
        { action: "put", path: ["elements", elementId, "data", "h"], value: newH },
        { action: "put", path: ["elements", elementId, "data", "w"], value: newW },
        { action: "put", path: ["elements", elementId, "data", "type"], value: "" },
        { action: "put", path: ["elements", elementId, "data", "radius"], value: 0 },
        { action: "splice", path: ["elements", elementId, "data", "type", 0], value: "rect" },
      ]

      applyPatches(canvas, doc, patches)

      expect(renderable.element).toBe(element)
      expect(renderable.container.x).toBe(newX + newW / 2)
      expect(renderable.container.y).toBe(newY + newH / 2)
      expect(renderable.redraw).toHaveBeenCalledTimes(1)
    })
  })

  describe("patch grouping", () => {
    test("groups multiple patches for same element into single mutation", () => {
      const elementId = "test-element"
      const element = createRectElement(elementId, { x: 200, y: 300, angle: 0.5 })
      doc = createMockDoc({ [elementId]: element })

      const renderable = createMockRenderable(createRectElement(elementId))
      canvas.elements.set(elementId, renderable)

      const patches: Patch[] = [
        { action: "put", path: ["elements", elementId, "x"], value: 200 },
        { action: "put", path: ["elements", elementId, "y"], value: 300 },
        { action: "put", path: ["elements", elementId, "angle"], value: 0.5 },
      ]

      applyPatches(canvas, doc, patches)

      expect(renderable.redraw).toHaveBeenCalledTimes(1)
    })

    test("delete takes precedence over update for same element", () => {
      const elementId = "test-element"
      doc = createMockDoc({})

      const element = createRectElement(elementId)
      const renderable = createMockRenderable(element)
      canvas.elements.set(elementId, renderable)

      const patches: Patch[] = [
        { action: "put", path: ["elements", elementId, "x"], value: 500 },
        { action: "del", path: ["elements", elementId] },
      ]

      applyPatches(canvas, doc, patches)

      expect(canvas.elements.has(elementId)).toBe(false)
      expect(renderable.destroy).toHaveBeenCalledTimes(1)
      expect(renderable.redraw).not.toHaveBeenCalled()
    })

    test("create followed by updates results in create only", () => {
      const elementId = "new-element"
      const element = createRectElement(elementId, { x: 300, y: 400 })
      doc = createMockDoc({ [elementId]: element })

      const patches: Patch[] = [
        { action: "put", path: ["elements", elementId], value: {} },
        { action: "put", path: ["elements", elementId, "x"], value: 300 },
        { action: "put", path: ["elements", elementId, "y"], value: 400 },
      ]

      applyPatches(canvas, doc, patches)

      expect(canvas.elements.has(elementId)).toBe(true)
      expect(canvas.bottomLayer.attach).toHaveBeenCalledTimes(1)
    })
  })

  describe("ignores non-element patches", () => {
    test("ignores patches not targeting elements", () => {
      const elementId = "test-element"
      const element = createRectElement(elementId)
      doc = createMockDoc({ [elementId]: element })

      const renderable = createMockRenderable(element)
      canvas.elements.set(elementId, renderable)

      const patches: Patch[] = [
        { action: "put", path: ["name"], value: "New Canvas Name" },
        { action: "put", path: ["groups", "group-1"], value: {} },
        { action: "put", path: ["id"], value: "new-id" },
      ]

      applyPatches(canvas, doc, patches)

      expect(renderable.redraw).not.toHaveBeenCalled()
      expect(renderable.destroy).not.toHaveBeenCalled()
    })

    test("ignores patches with path length < 2", () => {
      doc = createMockDoc({})

      const patches: Patch[] = [
        { action: "put", path: ["elements"], value: {} },
      ]

      expect(() => applyPatches(canvas, doc, patches)).not.toThrow()
    })
  })

  describe("handles unknown element types", () => {
    test("does not create renderable for unknown element type", () => {
      const elementId = "unknown-element"
      const element = {
        ...createRectElement(elementId),
        data: { type: 'unknown-type' },
      } as unknown as TElement
      doc = createMockDoc({ [elementId]: element })

      const patches: Patch[] = [
        { action: "put", path: ["elements", elementId], value: {} },
      ]

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      applyPatches(canvas, doc, patches)

      expect(canvas.elements.has(elementId)).toBe(false)
      expect(warnSpy).toHaveBeenCalled()

      warnSpy.mockRestore()
    })
  })

  describe("handles missing doc elements", () => {
    test("does not create element if not in doc", () => {
      const elementId = "missing-element"
      doc = createMockDoc({})

      const patches: Patch[] = [
        { action: "put", path: ["elements", elementId], value: {} },
      ]

      applyPatches(canvas, doc, patches)

      expect(canvas.elements.has(elementId)).toBe(false)
    })

    test("does not update element if not in doc", () => {
      const elementId = "missing-element"
      doc = createMockDoc({})

      const element = createRectElement(elementId)
      const renderable = createMockRenderable(element)
      canvas.elements.set(elementId, renderable)

      const patches: Patch[] = [
        { action: "put", path: ["elements", elementId, "x"], value: 500 },
      ]

      applyPatches(canvas, doc, patches)

      expect(renderable.redraw).not.toHaveBeenCalled()
    })
  })
})
