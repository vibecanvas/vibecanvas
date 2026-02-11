import type { Canvas } from "@/features/canvas-crdt/canvas/canvas"
import type { TBackendElementOf } from "../../element.abstract"
import { Graphics, Point } from "pixi.js"
import type { TPoint2D } from "@vibecanvas/shell/automerge/index"

/**
 * Context required for anchor point drag handlers.
 * Uses getter functions to always access current element reference (important after CRDT updates).
 */
export type TLineAnchorContext = {
  getElement: () => TBackendElementOf<'line'>
  id: string
  canvas: Canvas
  anchorGraphics: Graphics[]
  redraw: () => void
  worldDeltaToLocal: (dx: number, dy: number) => { x: number; y: number }
}

/**
 * Attaches drag handlers to an anchor Graphics object.
 * Handles all points in the points array.
 *
 * Features:
 * - Rotation-aware: transforms world delta by inverse rotation
 * - CRDT persistence: saves changes on pointerup
 * - Undo support: records undo entry with captured initial state
 */
export function attachAnchorHandlers(g: Graphics, ctx: TLineAnchorContext): void {
  g.eventMode = 'static'
  g.cursor = 'pointer'
  g.visible = false // Initially hidden, shown via updateVisibility()

  let lastPosition: Point | null = null
  let hasDragged = false
  // Capture initial state for undo
  let initialX: number
  let initialY: number
  let initialPoints: TPoint2D[]

  g.on('pointerdown', (e) => {
    // Capture initial state for undo
    initialX = ctx.getElement().x
    initialY = ctx.getElement().y
    initialPoints = ctx.getElement().data.points.map(p => [...p] as TPoint2D)

    lastPosition = new Point(e.globalX, e.globalY)
    hasDragged = false
    e.stopPropagation()
  })

  g.on('globalpointermove', (e) => {
    // Find current index of this graphics in the pool at event time
    const currentIdx = ctx.anchorGraphics.indexOf(g)
    if (currentIdx === -1 || !lastPosition) return

    hasDragged = true

    // Incremental delta in screen/world space
    const scale = ctx.canvas.app.stage.scale.x
    const worldDeltaX = (e.globalX - lastPosition.x) / scale
    const worldDeltaY = (e.globalY - lastPosition.y) / scale

    // Transform world delta to local space (accounting for rotation)
    const localDelta = ctx.worldDeltaToLocal(worldDeltaX, worldDeltaY)

    // Update lastPosition for next frame
    lastPosition.set(e.globalX, e.globalY)

    if (currentIdx === 0) {
      // Start point (points[0]): move element position (in world space)
      // and compensate all other points to keep them fixed in world space
      ctx.getElement().x += worldDeltaX
      ctx.getElement().y += worldDeltaY
      // Compensate all other points (they're in local space)
      for (let i = 1; i < ctx.getElement().data.points.length; i++) {
        ctx.getElement().data.points[i][0] -= localDelta.x
        ctx.getElement().data.points[i][1] -= localDelta.y
      }
    } else {
      // Other points: add local delta directly
      ctx.getElement().data.points[currentIdx][0] += localDelta.x
      ctx.getElement().data.points[currentIdx][1] += localDelta.y
    }

    ctx.redraw()
  })

  g.on('pointerup', () => {
    // Capture drag state and reset IMMEDIATELY to release drag
    const wasDragging = hasDragged
    hasDragged = false
    lastPosition = null

    if (!wasDragging) return

    // Capture final state for redo
    const finalX = ctx.getElement().x
    const finalY = ctx.getElement().y
    const finalPoints = ctx.getElement().data.points.map(p => [...p] as TPoint2D)
    const elementId = ctx.id

    // Persist to CRDT
    ctx.canvas.handle.change(doc => {
      const el = doc.elements[elementId]
      if (el && (el.data.type === 'line' || el.data.type === 'arrow')) {
        el.x = finalX
        el.y = finalY
        // Update points by replacing array contents
        const docPoints = el.data.points
        docPoints.splice(0, docPoints.length)
        for (const pt of finalPoints) {
          docPoints.push([...pt])
        }
      }
    })

    // Record undo entry
    ctx.canvas.undoManager.record({
      label: 'Edit Line Point',
      undo: () => {
        ctx.canvas.handle.change(doc => {
          const el = doc.elements[elementId]
          if (el && (el.data.type === 'line' || el.data.type === 'arrow')) {
            el.x = initialX
            el.y = initialY
            const docPoints = el.data.points
            docPoints.splice(0, docPoints.length)
            for (const pt of initialPoints) {
              docPoints.push([...pt])
            }
          }
        })
      },
      redo: () => {
        ctx.canvas.handle.change(doc => {
          const el = doc.elements[elementId]
          if (el && (el.data.type === 'line' || el.data.type === 'arrow')) {
            el.x = finalX
            el.y = finalY
            const docPoints = el.data.points
            docPoints.splice(0, docPoints.length)
            for (const pt of finalPoints) {
              docPoints.push([...pt])
            }
          }
        })
      },
    })
  })

  g.on('pointerupoutside', () => {
    // Capture drag state and reset IMMEDIATELY to release drag
    const wasDragging = hasDragged
    hasDragged = false
    lastPosition = null

    if (!wasDragging) return

    // Capture final state for redo
    const finalX = ctx.getElement().x
    const finalY = ctx.getElement().y
    const finalPoints = ctx.getElement().data.points.map(p => [...p] as TPoint2D)
    const elementId = ctx.id

    // Persist to CRDT
    ctx.canvas.handle.change(doc => {
      const el = doc.elements[elementId]
      if (el && (el.data.type === 'line' || el.data.type === 'arrow')) {
        el.x = finalX
        el.y = finalY
        const docPoints = el.data.points
        docPoints.splice(0, docPoints.length)
        for (const pt of finalPoints) {
          docPoints.push([...pt])
        }
      }
    })

    ctx.canvas.undoManager.record({
      label: 'Edit Line Point',
      undo: () => {
        ctx.canvas.handle.change(doc => {
          const el = doc.elements[elementId]
          if (el && (el.data.type === 'line' || el.data.type === 'arrow')) {
            el.x = initialX
            el.y = initialY
            const docPoints = el.data.points
            docPoints.splice(0, docPoints.length)
            for (const pt of initialPoints) {
              docPoints.push([...pt])
            }
          }
        })
      },
      redo: () => {
        ctx.canvas.handle.change(doc => {
          const el = doc.elements[elementId]
          if (el && (el.data.type === 'line' || el.data.type === 'arrow')) {
            el.x = finalX
            el.y = finalY
            const docPoints = el.data.points
            docPoints.splice(0, docPoints.length)
            for (const pt of finalPoints) {
              docPoints.push([...pt])
            }
          }
        })
      },
    })
  })
}
