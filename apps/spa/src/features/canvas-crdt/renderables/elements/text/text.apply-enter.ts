import type { Text } from "pixi.js"
import type { TApplyContext } from "../rect/rect.apply-context"
import { TTextData } from "@vibecanvas/shell"

/**
 * Apply enter action to a text element.
 * Opens inline text editing textarea overlay.
 *
 * This is unique to text elements - creates a DOM input positioned
 * over the canvas text that tracks pan/zoom in real-time.
 *
 * Returns null (no CRDT changes - changes are made on blur).
 */
export function applyEnter(ctx: TApplyContext<TTextData>, text: Text): null {
  ctx.transformBox?.hide()

  const textColor = ctx.element.style.strokeColor && ctx.element.style.strokeColor !== 'transparent'
    ? ctx.element.style.strokeColor
    : '#1f1f22'
  const textOpacity = ctx.element.style.opacity ?? 1
  const lineHeightPx = ctx.element.data.lineHeight <= 4
    ? ctx.element.data.fontSize * ctx.element.data.lineHeight
    : ctx.element.data.lineHeight

  const textInput = document.createElement('textarea')
  const initialTextValue = text.text
  textInput.style.position = 'fixed'
  textInput.style.padding = '0'
  textInput.style.margin = '0'
  // Use outline instead of border so edit chrome doesn't shift text content.
  textInput.style.border = 'none'
  textInput.style.outline = '1px solid #0066ff'
  textInput.style.boxSizing = 'border-box'
  textInput.style.backgroundColor = 'transparent'
  textInput.style.color = textColor
  textInput.style.caretColor = textColor
  textInput.style.opacity = `${textOpacity}`
  textInput.style.fontFamily = ctx.element.data.fontFamily
  textInput.style.lineHeight = `${lineHeightPx}px`
  textInput.style.textAlign = ctx.element.data.textAlign
  textInput.style.whiteSpace = 'pre'
  textInput.style.overflow = 'hidden'
  textInput.style.resize = 'none'
  textInput.style.transformOrigin = 'top left'
  textInput.style.zIndex = '1000'
  textInput.spellcheck = false
  textInput.wrap = 'off'
  textInput.rows = 1
  textInput.cols = 1
  textInput.value = text.text

  let liveWidth = Math.max(1, ctx.element.data.w)
  let liveHeight = Math.max(1, ctx.element.data.h)

  const getScale = () => ctx.canvas.app.stage.scale.x

  const measureTextWorldSize = (value: string): { w: number, h: number } => {
    const prevText = text.text
    text.text = value === '' ? ' ' : value
    const w = Math.max(1, text.width)
    const h = Math.max(1, text.height)
    text.text = prevText
    return { w, h }
  }

  const updateLiveDimensionsFromInput = () => {
    const measured = measureTextWorldSize(textInput.value)
    liveWidth = measured.w
    liveHeight = measured.h
  }

  // Update input position/size to match canvas text (handles pan/zoom)
  const updateInputTransform = () => {
    const canvasRect = ctx.canvas.app.canvas.getBoundingClientRect()
    const globalPos = text.toGlobal({ x: 0, y: 0 })
    const scale = getScale()

    textInput.style.left = `${globalPos.x + canvasRect.left}px`
    textInput.style.top = `${globalPos.y + canvasRect.top}px`
    textInput.style.width = `${liveWidth * scale}px`
    textInput.style.height = `${liveHeight * scale}px`
    textInput.style.fontSize = `${ctx.element.data.fontSize * scale}px`
    textInput.style.lineHeight = `${lineHeightPx * scale}px`
    textInput.style.transform = `rotate(${ctx.element.angle}rad)`
  }

  textInput.addEventListener('input', updateLiveDimensionsFromInput)
  updateLiveDimensionsFromInput()

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

    // Save current text origin in canvas/world space so editing keeps anchor stable.
    // Do not use toGlobal() here because that returns screen space (includes stage pan/zoom).
    const anchorGlobal = text.toGlobal({ x: 0, y: 0 })
    const anchorWorld = ctx.canvas.app.stage.toLocal(anchorGlobal)
    const anchorWorldX = anchorWorld.x
    const anchorWorldY = anchorWorld.y

    // Update text and calculate new dimensions
    const nextTextValue = textInput.value
    const measured = measureTextWorldSize(nextTextValue)

    ctx.element.data.text = nextTextValue
    text.text = ctx.element.data.text
    const newW = measured.w
    const newH = measured.h

    // Keep element dimensions in sync with rendered text immediately
    ctx.element.data.w = newW
    ctx.element.data.h = newH

    // Recompute element position so the same world anchor stays fixed after size change.
    const rotation = ctx.element.angle
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    const centerX = anchorWorldX + (newW / 2) * cos - (newH / 2) * sin
    const centerY = anchorWorldY + (newW / 2) * sin + (newH / 2) * cos

    ctx.element.x = centerX - newW / 2
    ctx.element.y = centerY - newH / 2

    text.visible = true
    ctx.redraw()
    textInput.remove()

    const nextX = ctx.element.x
    const nextY = ctx.element.y
    const nextW = ctx.element.data.w
    const nextH = ctx.element.data.h
    const nextText = ctx.element.data.text

    ctx.canvas.handle.change(doc => {
      const element = doc.elements[ctx.id]
      if (!element) return

      element.x = nextX
      element.y = nextY
      element.updatedAt = Date.now()

      const data = element.data as TTextData
      data.text = nextText
      data.w = nextW
      data.h = nextH
    })
  })

  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      textInput.blur()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      textInput.value = initialTextValue
      textInput.blur()
    }
  })

  document.body.appendChild(textInput)
  textInput.focus()
  textInput.select()

  return null
}
