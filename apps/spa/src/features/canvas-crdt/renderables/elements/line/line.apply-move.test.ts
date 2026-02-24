import { describe, expect, test, vi } from "vitest"
import { applyMove } from "./line.apply-move"

describe("line.apply-move", () => {
  test("updates model and container positions without redraw", () => {
    const redraw = vi.fn()
    const ctx = {
      id: "line-1",
      element: {
        x: 20,
        y: 40,
      },
      container: {
        x: 20,
        y: 40,
      },
      redraw,
    } as any

    const result = applyMove(ctx, {
      type: "move",
      delta: { x: -7, y: 13 },
    })

    expect(ctx.element.x).toBe(13)
    expect(ctx.element.y).toBe(53)
    expect(ctx.container.x).toBe(13)
    expect(ctx.container.y).toBe(53)
    expect(redraw).not.toHaveBeenCalled()
    expect(result.changes).toEqual([
      { op: "update", dest: "crdt", path: ["elements", "line-1", "x"], value: 13 },
      { op: "update", dest: "crdt", path: ["elements", "line-1", "y"], value: 53 },
    ])
  })
})
