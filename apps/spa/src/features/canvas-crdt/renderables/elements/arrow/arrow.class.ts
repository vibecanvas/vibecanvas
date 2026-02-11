import type { Canvas } from "@/features/canvas-crdt/canvas/canvas"
import { AElement, type TBackendElementOf } from "../../element.abstract"
import { LineElement } from "../line/line.class"
import type { TArrowData } from "@vibecanvas/shell/automerge/index"
import { drawStartCap, drawEndCap } from "./arrow.draw"
import { Graphics } from "pixi.js"

/**
 * ArrowElement - A line element with optional arrow caps at start and end.
 *
 * Extends LineElement to inherit all line behavior:
 * - Anchor point editing
 * - Midpoint insertion
 * - Rotation around geometric center
 * - Transform box for multi-segment arrows
 *
 * Adds:
 * - Start cap (none, arrow, dot, diamond)
 * - End cap (none, arrow, dot, diamond)
 *
 * Caps are positioned at the line endpoints and rotated to match
 * the line direction.
 */
export class ArrowElement extends LineElement {
  private startCapGraphics = new Graphics()
  private endCapGraphics = new Graphics()

  constructor(element: TBackendElementOf<'arrow'>, canvas: Canvas) {
    // LineElement constructor handles all base setup:
    // - graphics (line stroke)
    // - anchorGraphics pool
    // - midpointGraphics pool
    // - transformBox
    // - pointer listeners
    // Cast to line since LineElement constructor expects 'line' type
    super(element as unknown as TBackendElementOf<'line'>, canvas)

    // Enable zIndex sorting so caps render on top of anchors
    this.container.sortableChildren = true


    // Add cap graphics with high zIndex to render above anchors
    this.startCapGraphics.zIndex = 10
    this.endCapGraphics.zIndex = 10
    this.container.addChild(this.startCapGraphics)
    this.container.addChild(this.endCapGraphics)

    // Initial draw with caps (super.redraw() was called in parent constructor,
    // but we need to redraw to add caps)
    this.redraw()
  }

  /**
   * Get the arrow-specific data (with startCap, endCap).
   * This casts the element.data to TArrowData.
   */
  private get arrowData(): TArrowData {
    return this.element.data as unknown as TArrowData
  }

  /**
   * Override redraw to add cap rendering after the line is drawn.
   */
  override redraw(): void {
    // Draw line (parent handles stroke, anchor points, midpoints)
    super.redraw()

    // Guard: cap graphics may not exist during super() constructor call
    if (!this.startCapGraphics || !this.endCapGraphics) return

    // Get data with arrow-specific fields
    const data = this.arrowData
    const style = this.element.style

    // Calculate graphics offset (same as parent uses)
    const graphicsBounds = this.graphics.getLocalBounds()
    const expansion = this.getExpansionOffsetValues()
    const offsetX = -graphicsBounds.x + expansion.x
    const offsetY = -graphicsBounds.y + expansion.y

    // Draw start cap at origin (0,0) in local space
    drawStartCap({
      graphics: this.startCapGraphics,
      capType: data.startCap,
      points: data.points,
      style,
      offset: { x: offsetX, y: offsetY }
    })

    // Draw end cap at last point
    drawEndCap({
      graphics: this.endCapGraphics,
      capType: data.endCap,
      points: data.points,
      style,
      offset: { x: offsetX, y: offsetY }
    })
  }

  /**
   * Type guard for ArrowElement.
   */
  static isArrowElement(instance: AElement): instance is ArrowElement {
    return instance instanceof ArrowElement
  }
}
