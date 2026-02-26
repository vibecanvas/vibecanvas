import { Show, createMemo, createSignal } from 'solid-js'
import { store } from '@/store'
import { ColorPicker } from './ColorPicker'
import { StrokeWidthPicker } from './StrokeWidthPicker'
import { LineTypePicker } from './LineTypePicker'
import { CapPicker } from './CapPicker'
import { FontFamilyPicker } from './FontFamilyPicker'
import { OpacitySlider } from './OpacitySlider'
import type { Canvas } from '@/features/canvas-crdt/canvas/canvas'
import type { TLineType, TCapStyle, TFontFamily } from '../types'

/** Element types that support fill/stroke/width style menu */
const SHAPE_TYPES = new Set(['rect', 'ellipse', 'diamond'])

/** Element types that support lineType (line-like elements) */
const LINE_TYPES_SET = new Set(['line', 'arrow'])

/** Element types that support startCap/endCap (arrows only) */
const ARROW_TYPES = new Set(['arrow'])

/** Element types that support text data formatting */
const TEXT_TYPES = new Set(['text'])

type TDrawingStyle = {
  backgroundColor?: string
  strokeColor?: string
  strokeWidth?: number
  opacity?: number
  cornerRadius?: number
}

type TLineData = {
  type: string
  lineType?: TLineType
  startCap?: TCapStyle
  endCap?: TCapStyle
}

type TTextData = {
  type: string
  fontFamily?: TFontFamily
}

type TVisibleSections = {
  showFillPicker: boolean
  showStrokePickers: boolean
  showLinePickers: boolean
  showCapPickers: boolean
  showTextPickers: boolean
  showOpacityPicker: boolean
}

/** Get element types from selected IDs (resolves groups to their members) */
function getSelectedElementTypes(canvas: Canvas, selectedIds: string[]): Set<string> {
  const types = new Set<string>()

  for (const id of selectedIds) {
    // Check if it's a group
    const group = canvas.groupManager.groups.get(id)
    if (group) {
      // Recursively get types from group members
      const memberIds = group.members.map(m => m.id)
      const memberTypes = getSelectedElementTypes(canvas, memberIds)
      memberTypes.forEach(t => types.add(t))
    } else {
      // It's an element
      const element = canvas.elements.get(id)
      if (element) {
        types.add(element.element.data.type)
      }
    }
  }

  return types
}

/** Determine which picker sections to show based on selected element types */
function getVisibleSections(canvas: Canvas, selectedIds: string[]): TVisibleSections {
  const types = getSelectedElementTypes(canvas, selectedIds)
  if (types.size === 0) {
    return { showFillPicker: false, showStrokePickers: false, showLinePickers: false, showCapPickers: false, showTextPickers: false, showOpacityPicker: false }
  }

  const hasShapeTypes = [...types].some(t => SHAPE_TYPES.has(t))
  const hasLineTypes = [...types].some(t => LINE_TYPES_SET.has(t))
  const hasArrowTypes = [...types].some(t => ARROW_TYPES.has(t))
  const hasTextTypes = [...types].some(t => TEXT_TYPES.has(t))
  const hasOpacityTypes = [...types].some(t => t !== 'chat' && t !== 'filetree' && t !== 'terminal')

  return {
    // Fill picker: only for shapes (rect/ellipse/diamond) - lines don't have fill
    showFillPicker: hasShapeTypes,
    // Stroke pickers: for shapes and lines/arrows
    showStrokePickers: hasShapeTypes || hasLineTypes,
    // Line pickers: only when line/arrow types are selected
    showLinePickers: hasLineTypes,
    // Cap pickers: only when arrow types are selected
    showCapPickers: hasArrowTypes,
    // Text pickers: when text types are selected
    showTextPickers: hasTextTypes,
    // Opacity picker: all non-chat element types
    showOpacityPicker: hasOpacityTypes,
  }
}

function getSelectedTextElementIds(canvas: Canvas, selectedIds: string[]): string[] {
  const textIds = new Set<string>()

  for (const id of selectedIds) {
    const group = canvas.groupManager.groups.get(id)
    if (group) {
      const nested = getSelectedTextElementIds(canvas, group.members.map(m => m.id))
      nested.forEach(textId => textIds.add(textId))
      continue
    }

    const element = canvas.elements.get(id)
    if (element?.element.data.type === 'text') {
      textIds.add(id)
    }
  }

  return [...textIds]
}

function getSelectedNonWidgetElementIds(canvas: Canvas, selectedIds: string[]): string[] {
  const elementIds = new Set<string>()

  for (const id of selectedIds) {
    const group = canvas.groupManager.groups.get(id)
    if (group) {
      const nested = getSelectedNonWidgetElementIds(canvas, group.members.map(m => m.id))
      nested.forEach(memberId => elementIds.add(memberId))
      continue
    }

    const element = canvas.elements.get(id)
    if (!element) continue
    if (element.element.data.type === 'chat') continue
    if (element.element.data.type === 'filetree') continue
    if (element.element.data.type === 'terminal') continue
    elementIds.add(id)
  }

  return [...elementIds]
}

export function SelectionStyleMenu() {
  // Refresh signal to force memos to re-run after CRDT updates
  const [refreshKey, setRefreshKey] = createSignal(0)
  const triggerRefresh = () => setRefreshKey(k => k + 1)

  const visibility = createMemo((): TVisibleSections => {
    const canvas = store.canvasSlice.canvas
    const selectedIds = store.canvasSlice.selectedIds
    if (!canvas || selectedIds.length === 0) {
      return { showFillPicker: false, showStrokePickers: false, showLinePickers: false, showCapPickers: false, showTextPickers: false, showOpacityPicker: false }
    }
    return getVisibleSections(canvas, selectedIds)
  })

  const shouldShow = createMemo(() => {
    const v = visibility()
    return v.showFillPicker || v.showStrokePickers || v.showLinePickers || v.showCapPickers || v.showTextPickers || v.showOpacityPicker
  })

  const currentStyle = createMemo((): TDrawingStyle => {
    refreshKey() // Track refresh signal
    const canvas = store.canvasSlice.canvas
    const selectedIds = store.canvasSlice.selectedIds
    if (!canvas || selectedIds.length === 0) return {}
    return canvas.getElementStyle(selectedIds[0]) ?? {}
  })

  const currentLineData = createMemo((): TLineData => {
    refreshKey() // Track refresh signal
    const canvas = store.canvasSlice.canvas
    const selectedIds = store.canvasSlice.selectedIds
    if (!canvas || selectedIds.length === 0) return { type: '' }
    return canvas.getElementData(selectedIds[0]) ?? { type: '' }
  })

  const currentTextData = createMemo((): TTextData => {
    refreshKey()
    const canvas = store.canvasSlice.canvas
    const selectedIds = store.canvasSlice.selectedIds
    if (!canvas || selectedIds.length === 0) return { type: '' }

    for (const id of selectedIds) {
      const textData = canvas.getElementTextData(id)
      if (textData) {
        return { type: textData.type, fontFamily: textData.fontFamily as TFontFamily | undefined }
      }
    }

    return { type: '' }
  })

  const activeCanvasId = createMemo(() => store.canvasSlice.backendCanvasActive?.id ?? null)

  const selectedTextIds = createMemo(() => {
    const canvas = store.canvasSlice.canvas
    const selectedIds = store.canvasSlice.selectedIds
    if (!canvas || selectedIds.length === 0) return []
    return getSelectedTextElementIds(canvas, selectedIds)
  })

  const selectedNonWidgetIds = createMemo(() => {
    const canvas = store.canvasSlice.canvas
    const selectedIds = store.canvasSlice.selectedIds
    if (!canvas || selectedIds.length === 0) return []
    return getSelectedNonWidgetElementIds(canvas, selectedIds)
  })

  const updateSelectedStyles = (styleUpdates: Partial<TDrawingStyle>) => {
    const canvas = store.canvasSlice.canvas
    if (!canvas) return
    for (const id of store.canvasSlice.selectedIds) {
      canvas.updateElementStyle(id, styleUpdates)
    }
    triggerRefresh()
  }

  const updateSelectedData = (dataUpdates: Partial<{ lineType: TLineType; startCap: TCapStyle; endCap: TCapStyle }>) => {
    const canvas = store.canvasSlice.canvas
    if (!canvas) return
    for (const id of store.canvasSlice.selectedIds) {
      canvas.updateElementData(id, dataUpdates)
    }
    triggerRefresh()
  }

  const updateSelectedTextData = (dataUpdates: Partial<{ fontFamily: TFontFamily }>) => {
    const canvas = store.canvasSlice.canvas
    if (!canvas) return
    for (const id of selectedTextIds()) {
      canvas.updateElementTextData(id, dataUpdates)
    }
    triggerRefresh()
  }

  const currentTextStyle = createMemo((): { strokeColor?: string } => {
    refreshKey()
    const canvas = store.canvasSlice.canvas
    const textId = selectedTextIds()[0]
    if (!canvas || !textId) return {}

    const style = canvas.getElementStyle(textId)
    return style ? { strokeColor: style.strokeColor } : {}
  })

  const updateSelectedTextStyles = (styleUpdates: Partial<{ strokeColor?: string }>) => {
    const canvas = store.canvasSlice.canvas
    if (!canvas) return
    for (const id of selectedTextIds()) {
      canvas.updateElementStyle(id, styleUpdates)
    }
    triggerRefresh()
  }

  const currentOpacity = createMemo(() => {
    refreshKey()
    const canvas = store.canvasSlice.canvas
    const firstId = selectedNonWidgetIds()[0]
    if (!canvas || !firstId) return 1
    return canvas.getElementStyle(firstId)?.opacity ?? 1
  })

  const updateSelectedOpacity = (opacity: number) => {
    const canvas = store.canvasSlice.canvas
    if (!canvas) return
    for (const id of selectedNonWidgetIds()) {
      canvas.updateElementStyle(id, { opacity })
    }
    triggerRefresh()
  }

  return (
    <Show when={shouldShow()}>
      <div class="absolute left-3 top-1/2 -translate-y-1/2 z-40 bg-card border border-border shadow-md p-2 flex flex-col gap-3">
        {/* Fill Picker - only for shapes */}
        <Show when={visibility().showFillPicker}>
          <div class="flex flex-col gap-1">
            <span class="text-[10px] text-muted-foreground font-mono">FILL</span>
            <ColorPicker
              value={currentStyle().backgroundColor}
              onChange={(color) => updateSelectedStyles({ backgroundColor: color })}
              showTransparent
              mode="fill"
              canvasId={activeCanvasId()}
            />
          </div>
        </Show>

        {/* Stroke Pickers - for shapes and lines */}
        <Show when={visibility().showStrokePickers}>
          <div class="flex flex-col gap-1">
            <span class="text-[10px] text-muted-foreground font-mono">STROKE</span>
            <ColorPicker
              value={currentStyle().strokeColor}
              onChange={(color) => updateSelectedStyles({ strokeColor: color })}
              mode="stroke"
              canvasId={activeCanvasId()}
            />
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-[10px] text-muted-foreground font-mono">WIDTH</span>
            <StrokeWidthPicker
              value={currentStyle().strokeWidth ?? 2}
              onChange={(width) => updateSelectedStyles({ strokeWidth: width })}
            />
          </div>
        </Show>

        {/* Line Type Picker - only for lines/arrows */}
        <Show when={visibility().showLinePickers}>
          <div class="flex flex-col gap-1">
            <span class="text-[10px] text-muted-foreground font-mono">LINE</span>
            <LineTypePicker
              value={currentLineData().lineType}
              onChange={(lineType) => updateSelectedData({ lineType })}
            />
          </div>
        </Show>

        {/* Cap Pickers - only for arrows */}
        <Show when={visibility().showCapPickers}>
          <div class="flex flex-col gap-1">
            <span class="text-[10px] text-muted-foreground font-mono">START</span>
            <CapPicker
              value={currentLineData().startCap}
              onChange={(startCap) => updateSelectedData({ startCap })}
              label="START"
            />
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-[10px] text-muted-foreground font-mono">END</span>
            <CapPicker
              value={currentLineData().endCap}
              onChange={(endCap) => updateSelectedData({ endCap })}
              label="END"
            />
          </div>
        </Show>

        <Show when={visibility().showTextPickers}>
          <div class="flex flex-col gap-1">
            <span class="text-[10px] text-muted-foreground font-mono">COLOR</span>
            <ColorPicker
              value={currentTextStyle().strokeColor}
              onChange={(color) => updateSelectedTextStyles({ strokeColor: color })}
              mode="stroke"
              canvasId={activeCanvasId()}
            />
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-[10px] text-muted-foreground font-mono">FONT</span>
            <FontFamilyPicker
              value={currentTextData().fontFamily}
              onChange={(fontFamily) => updateSelectedTextData({ fontFamily })}
            />
          </div>
        </Show>

        <Show when={visibility().showOpacityPicker}>
          <div class="flex flex-col gap-1">
            <span class="text-[10px] text-muted-foreground font-mono">OPACITY</span>
            <OpacitySlider
              value={currentOpacity()}
              onChange={updateSelectedOpacity}
            />
          </div>
        </Show>
      </div>
    </Show>
  )
}
