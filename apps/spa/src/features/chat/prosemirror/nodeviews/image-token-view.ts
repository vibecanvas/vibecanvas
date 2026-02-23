import type { Node as ProseMirrorNode } from "prosemirror-model"
import type { EditorView, NodeView } from "prosemirror-view"

const TOOLTIP_WIDTH = 220
const TOOLTIP_MARGIN = 8

class ImageTokenNodeView implements NodeView {
  dom: HTMLSpanElement
  private node: ProseMirrorNode
  private editorView: EditorView
  private getPos: (() => number | undefined) | boolean
  private label: HTMLSpanElement
  private tooltip: HTMLDivElement | null = null

  constructor(node: ProseMirrorNode, editorView: EditorView, getPos: (() => number | undefined) | boolean) {
    this.node = node
    this.editorView = editorView
    this.getPos = getPos

    this.dom = document.createElement("span")
    this.dom.className = "image-token-chip"
    this.dom.contentEditable = "false"

    this.label = document.createElement("span")
    this.label.className = "image-token-label"
    this.label.textContent = `[image: ${this.node.attrs.filename}]`
    this.dom.appendChild(this.label)

    const removeBtn = document.createElement("button")
    removeBtn.type = "button"
    removeBtn.className = "image-token-remove"
    removeBtn.textContent = "x"
    removeBtn.addEventListener("click", this.handleRemove)
    this.dom.appendChild(removeBtn)

    this.dom.addEventListener("mouseenter", this.showPreview)
    this.dom.addEventListener("mouseleave", this.hidePreview)
  }

  private handleRemove = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (typeof this.getPos !== "function") return

    const pos = this.getPos()
    if (typeof pos !== "number") return

    const tr = this.editorView.state.tr.delete(pos, pos + 1)
    this.editorView.dispatch(tr)
  }

  private showPreview = () => {
    if (this.tooltip) return

    const tooltip = document.createElement("div")
    tooltip.className = "image-token-tooltip"

    const image = document.createElement("img")
    image.src = String(this.node.attrs.url ?? "")
    image.alt = String(this.node.attrs.filename ?? "pasted image")
    image.className = "image-token-tooltip-image"
    tooltip.appendChild(image)

    const rect = this.dom.getBoundingClientRect()
    const left = Math.max(
      TOOLTIP_MARGIN,
      Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN),
    )
    const top = Math.max(TOOLTIP_MARGIN, rect.top - TOOLTIP_MARGIN)

    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`

    document.body.appendChild(tooltip)
    this.tooltip = tooltip
  }

  private hidePreview = () => {
    if (!this.tooltip) return

    this.tooltip.remove()
    this.tooltip = null
  }

  update(node: ProseMirrorNode) {
    if (node.type !== this.node.type) return false

    this.node = node
    this.label.textContent = `[image: ${this.node.attrs.filename}]`
    return true
  }

  stopEvent(event: Event) {
    return event.type === "click" && (event.target as HTMLElement).closest(".image-token-remove") != null
  }

  ignoreMutation() {
    return true
  }

  destroy() {
    this.hidePreview()
    this.dom.removeEventListener("mouseenter", this.showPreview)
    this.dom.removeEventListener("mouseleave", this.hidePreview)
  }
}

export { ImageTokenNodeView }
