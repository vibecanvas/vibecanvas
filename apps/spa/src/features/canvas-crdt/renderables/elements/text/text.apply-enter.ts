import type { Text } from "pixi.js"
import type { TApplyContext } from "../rect/rect.apply-context"
import { TTextData } from "@vibecanvas/shell"

/**
 * Apply enter action to a text element.
 * Opens inline text editing input overlay.
 *
 * This is unique to text elements - creates a DOM input positioned
 * over the canvas text that tracks pan/zoom in real-time.
 *
 * Returns null (no CRDT changes - changes are made on blur).
 */
export function applyEnter(ctx: TApplyContext<TTextData>, text: Text): null {
  ctx.transformBox?.hide()

  const textInput = document.createElement('input')
  textInput.style.position = 'fixed'
  textInput.style.minWidth = '100px'
  textInput.style.padding = '0'
  textInput.style.margin = '0'
  textInput.style.border = '1px solid #0066ff'
  textInput.style.outline = 'none'
  textInput.style.backgroundColor = 'transparent'
  textInput.style.color = 'black'
  textInput.style.fontFamily = ctx.element.data.fontFamily
  textInput.style.lineHeight = '1'
  textInput.style.transformOrigin = 'top left'
  textInput.style.zIndex = '1000'
  textInput.type = 'text'
  textInput.value = text.text

  // Update input position/size to match canvas text (handles pan/zoom)
  const updateInputTransform = () => {
    const canvasRect = ctx.canvas.app.canvas.getBoundingClientRect()
    const globalPos = text.toGlobal({ x: 0, y: 0 })
    const scale = ctx.canvas.app.stage.scale.x

    textInput.style.left = `${globalPos.x + canvasRect.left}px`
    textInput.style.top = `${globalPos.y + canvasRect.top}px`
    textInput.style.width = `${ctx.element.data.w * scale}px`
    textInput.style.height = `${ctx.element.data.h * scale}px`
    textInput.style.fontSize = `${ctx.element.data.fontSize * scale}px`
    textInput.style.transform = `rotate(${ctx.element.angle}rad)`
  }

  // Initial position
  updateInputTransform()

  // Continuously update position while input is open (handles pan/zoom)
  let rafId: number
  const updateLoop = () => {
    updateInputTransform()
    rafId = requestAnimationFrame(updateLoop)
  }
  rafId = requestAnimationFrame(updateLoop)

  // Hide the canvas text while editing
  text.visible = false

  // Capture phase listener to blur input when clicking outside
  // Fires before PixiJS events, but doesn't stop propagation
  const handlePointerDown = (e: PointerEvent) => {
    if (e.target !== textInput) {
      textInput.blur()
    }
  }
  document.addEventListener('pointerdown', handlePointerDown, true)

  textInput.addEventListener('blur', () => {
    cancelAnimationFrame(rafId)
    document.removeEventListener('pointerdown', handlePointerDown, true)

    // Save current center position (rotation center)
    const oldCenterX = ctx.element.x + ctx.element.data.w / 2
    const oldCenterY = ctx.element.y + ctx.element.data.h / 2

    // Update text and calculate new dimensions
    ctx.element.data.text = textInput.value
    text.text = ctx.element.data.text
    const newW = text.width
    const newH = text.height

    // Adjust position to maintain center (prevents shift when rotated)
    ctx.element.x = oldCenterX - newW / 2
    ctx.element.y = oldCenterY - newH / 2

    text.visible = true
    ctx.redraw()
    textInput.remove()
    ctx.canvas.handle.change(doc => {
      (doc.elements[ctx.id].data as TTextData).text = ctx.element.data.text
    })
  })

  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      textInput.blur()
    }
    if (e.key === 'Escape') {
      textInput.value = text.text // Revert
      textInput.blur()
    }
  })

  document.body.appendChild(textInput)
  textInput.focus()
  textInput.select()

  return null
}
