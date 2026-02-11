import type { Canvas } from "@/features/canvas-crdt/canvas/canvas"
import type { TBackendElementOf } from "../../element.abstract"
import { Graphics, Point } from "pixi.js"
import type { TPoint2D } from "@vibecanvas/shell/automerge/index"
import { computeMidpoints } from "./line.math"

/**
 * Context required for midpoint drag handlers.
 * Uses getter functions to always access current element reference (important after CRDT updates).
 */
export type TLineMidpointContext = {
  getElement: () => TBackendElementOf<'line'>
  id: string
  canvas: Canvas
  midpointGraphics: Graphics[]
  redraw: () => void
  worldDeltaToLocal: (dx: number, dy: number) => { x: number; y: number }
  setEditMode: (value: boolean) => void
}

/**
 * Attaches drag handlers to a midpoint Graphics object.
 *
 * Behavior on drag:
 * 1. pointerdown: Enters edit mode, captures initial state, inserts new point
 * 2. pointermove: Moves the newly created point (rotation-aware)
 * 3. pointerup: Persists to CRDT and records undo entry
 */
export function attachMidpointHandlers(g: Graphics, ctx: TLineMidpointContext): void {
  g.eventMode = 'static'
  g.cursor = 'pointer'
  g.visible = false // Initially hidden, shown via updateVisibility()

  let isDragging = false
  let newPointIndex: number | null = null
  let lastPosition: Point | null = null
  // Local working copy of points - modified during drag, persisted on pointerup
  let workingPoints: TPoint2D[] | null = null
  // Capture initial state for undo (before inserting new point)
  let initialX: number
  let initialY: number
  let initialPoints: TPoint2D[]

  g.on('pointerdown', (e) => {
    e.stopPropagation()

    // Find current index of this graphics in the pool at event time
    const idx = ctx.midpointGraphics.indexOf(g)
    if (idx === -1) return

    // Get midpoint info before we modify points
    const midpoints = computeMidpoints(ctx.getElement())
    const midpoint = midpoints[idx]
    if (!midpoint) return

    // Capture initial state for undo BEFORE modifying points
    initialX = ctx.getElement().x
    initialY = ctx.getElement().y
    initialPoints = ctx.getElement().data.points.map(p => [...p] as TPoint2D)

    // Enter edit mode when starting midpoint drag
    ctx.setEditMode(true)

    // Insert new point at midpoint position
    // pointIndex is the segment index (between points[i] and points[i+1])
    // New point goes at index pointIndex + 1
    newPointIndex = midpoint.pointIndex + 1
    workingPoints = [
      ...initialPoints.slice(0, newPointIndex),
      [midpoint.x, midpoint.y] as TPoint2D,
      ...initialPoints.slice(newPointIndex)
    ]

    // Update the local element reference for rendering
    ctx.getElement().data.points = workingPoints

    isDragging = true
    lastPosition = new Point(e.globalX, e.globalY)

    ctx.redraw()
  })

  g.on('globalpointermove', (e) => {
    if (!isDragging || newPointIndex === null || !lastPosition || !workingPoints) return

    // Use same delta logic as anchor points
    const scale = ctx.canvas.app.stage.scale.x
    const worldDeltaX = (e.globalX - lastPosition.x) / scale
    const worldDeltaY = (e.globalY - lastPosition.y) / scale
    lastPosition.set(e.globalX, e.globalY)

    // Transform world delta to local space (accounting for rotation)
    const localDelta = ctx.worldDeltaToLocal(worldDeltaX, worldDeltaY)

    // Move the newly inserted point
    workingPoints[newPointIndex][0] += localDelta.x
    workingPoints[newPointIndex][1] += localDelta.y

    // Update element reference with working copy for redraw
    ctx.getElement().data.points = workingPoints

    ctx.redraw()
  })

  g.on('pointerup', () => {
    // Capture drag state and reset IMMEDIATELY to release drag
    const wasDragging = isDragging
    const finalPoints = workingPoints ? workingPoints.map(p => [...p] as TPoint2D) : null
    isDragging = false
    newPointIndex = null
    lastPosition = null
    workingPoints = null

    if (!wasDragging || !finalPoints) return

    // Capture final position
    const finalX = ctx.getElement().x
    const finalY = ctx.getElement().y
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

    // Record undo entry
    const capturedInitialX = initialX
    const capturedInitialY = initialY
    const capturedInitialPoints = initialPoints.map(p => [...p] as TPoint2D)
    const capturedFinalPoints = finalPoints

    ctx.canvas.undoManager.record({
      label: 'Add Line Point',
      undo: () => {
        ctx.canvas.handle.change(doc => {
          const el = doc.elements[elementId]
          if (el && (el.data.type === 'line' || el.data.type === 'arrow')) {
            el.x = capturedInitialX
            el.y = capturedInitialY
            const docPoints = el.data.points
            docPoints.splice(0, docPoints.length)
            for (const pt of capturedInitialPoints) {
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
            for (const pt of capturedFinalPoints) {
              docPoints.push([...pt])
            }
          }
        })
      },
    })
  })

  g.on('pointerupoutside', () => {
    // Capture drag state and reset IMMEDIATELY to release drag
    const wasDragging = isDragging
    const finalPoints = workingPoints ? workingPoints.map(p => [...p] as TPoint2D) : null
    isDragging = false
    newPointIndex = null
    lastPosition = null
    workingPoints = null

    if (!wasDragging || !finalPoints) return

    // Capture final position
    const finalX = ctx.getElement().x
    const finalY = ctx.getElement().y
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

    // Record undo entry
    const capturedInitialX = initialX
    const capturedInitialY = initialY
    const capturedInitialPoints = initialPoints.map(p => [...p] as TPoint2D)
    const capturedFinalPoints = finalPoints

    ctx.canvas.undoManager.record({
      label: 'Add Line Point',
      undo: () => {
        ctx.canvas.handle.change(doc => {
          const el = doc.elements[elementId]
          if (el && (el.data.type === 'line' || el.data.type === 'arrow')) {
            el.x = capturedInitialX
            el.y = capturedInitialY
            const docPoints = el.data.points
            docPoints.splice(0, docPoints.length)
            for (const pt of capturedInitialPoints) {
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
            for (const pt of capturedFinalPoints) {
              docPoints.push([...pt])
            }
          }
        })
      },
    })
  })
}
