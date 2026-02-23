import { describe, expect, test, vi } from "vitest"
import { applyMove } from "./rect.apply-move"
import { BOUNDS } from "./rect.apply-context"

describe("rect.apply-move", () => {
  test("updates model and container positions without redraw", () => {
    const redraw = vi.fn()
    const ctx = {
      id: "rect-1",
      element: {
        x: 100,
        y: 200,
        data: { type: "rect", w: 120, h: 80 },
      },
      container: {
        x: 160,
        y: 240,
      },
      redraw,
    } as any

    const result = applyMove(ctx, {
      type: "move",
      delta: { x: 25, y: -15 },
    })

    expect(ctx.element.x).toBe(125)
    expect(ctx.element.y).toBe(185)
    expect(ctx.container.x).toBe(185)
    expect(ctx.container.y).toBe(225)
    expect(redraw).not.toHaveBeenCalled()
    expect(result.changes).toEqual([
      { op: "update", dest: "crdt", path: ["elements", "rect-1", "x"], value: 125 },
      { op: "update", dest: "crdt", path: ["elements", "rect-1", "y"], value: 185 },
    ])
  })

  test("applies clamped delta to container at bounds", () => {
    const redraw = vi.fn()
    const ctx = {
      id: "rect-2",
      element: {
        x: BOUNDS.MAX_X,
        y: BOUNDS.MIN_Y,
        data: { type: "rect", w: 80, h: 80 },
      },
      container: {
        x: 500,
        y: -500,
      },
      redraw,
    } as any

    applyMove(ctx, {
      type: "move",
      delta: { x: 50, y: -50 },
    })

    expect(ctx.element.x).toBe(BOUNDS.MAX_X)
    expect(ctx.element.y).toBe(BOUNDS.MIN_Y)
    expect(ctx.container.x).toBe(500)
    expect(ctx.container.y).toBe(-500)
    expect(redraw).not.toHaveBeenCalled()
  })
})
