import { ColorArea } from '@kobalte/core/color-area'
import { ColorField } from '@kobalte/core/color-field'
import { parseColor } from '@kobalte/core/colors'
import { ColorSwatch } from '@kobalte/core/color-swatch'
import { Menubar } from '@kobalte/core/menubar'
import { For, Show, createEffect, createMemo, createSignal } from 'solid-js'
import { COLOR_PANEL_COLORS, FILL_QUICK_COLORS, STROKE_QUICK_COLORS, getRecentColorStorageKey } from '../types'

interface Props {
  value: string | undefined
  onChange: (color: string) => void
  showTransparent?: boolean
  mode: 'fill' | 'stroke'
  canvasId?: string | null
}

const FALLBACK_COLOR = '#1f1f22'
const MAX_RECENT_COLORS = 6

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeColorValue(value: string | undefined): string {
  if (!value) return FALLBACK_COLOR
  if (value === 'transparent') return 'transparent'

  try {
    return parseColor(value).toString('hex')
  } catch {
    return FALLBACK_COLOR
  }
}

function toKobalteColor(value: string | undefined) {
  const normalized = normalizeColorValue(value)
  return parseColor(normalized === 'transparent' ? FALLBACK_COLOR : normalized)
}

export function ColorPicker(props: Props) {
  const [panelColor, setPanelColor] = createSignal(toKobalteColor(props.value))
  const [hexColor, setHexColor] = createSignal(normalizeColorValue(props.value === 'transparent' ? FALLBACK_COLOR : props.value))
  const [recentColors, setRecentColors] = createSignal<string[]>([])
  const [isPanelOpen, setIsPanelOpen] = createSignal(false)
  const [pendingRecentColor, setPendingRecentColor] = createSignal<string | null>(null)

  const quickColors = createMemo(() => props.mode === 'fill' ? FILL_QUICK_COLORS : STROKE_QUICK_COLORS)
  const currentValue = createMemo(() => normalizeColorValue(props.value))
  const currentSwatchValue = createMemo(() => currentValue() === 'transparent' ? FALLBACK_COLOR : currentValue())
  const panelColors = createMemo(() => {
    if (props.showTransparent) return COLOR_PANEL_COLORS

    return COLOR_PANEL_COLORS.map((color) => (
      color.value === 'transparent'
        ? { name: 'White', value: '#ffffff' }
        : color
    ))
  })
  const shades = createMemo(() => {
    const base = toKobalteColor(currentSwatchValue()).toFormat('hsb')
    const hue = clamp(base.getChannelValue('hue'), 0, 360)
    const saturation = clamp(base.getChannelValue('saturation'), 8, 100)
    const saturationSteps = [
      clamp(saturation * 0.35, 6, 100),
      clamp(saturation * 0.55, 8, 100),
      clamp(saturation * 0.75, 10, 100),
      clamp(saturation * 0.95, 12, 100),
      clamp(saturation * 1.1, 14, 100),
    ]
    const brightnessSteps = [96, 84, 70, 56, 42]

    return brightnessSteps.map((brightness, index) => (
      base
        .withChannelValue('hue', hue)
        .withChannelValue('saturation', saturationSteps[index])
        .withChannelValue('brightness', brightness)
        .toString('hex')
    ))
  })

  const updateRecentColors = (color: string) => {
    if (color === 'transparent') return

    const next = [color, ...recentColors().filter((item) => item !== color)].slice(0, MAX_RECENT_COLORS)
    setRecentColors(next)
    localStorage.setItem(getRecentColorStorageKey(props.mode, props.canvasId), JSON.stringify(next))
  }

  const applyColor = (value: string) => {
    const normalized = normalizeColorValue(value)
    const applied = normalized === 'transparent' ? 'transparent' : normalized

    props.onChange(applied)

    const next = applied === 'transparent' ? FALLBACK_COLOR : applied
    setPanelColor(toKobalteColor(next))
    setHexColor(next)

    if (applied === 'transparent') {
      setPendingRecentColor(null)
      return
    }

    if (isPanelOpen()) {
      setPendingRecentColor(next)
      return
    }

    updateRecentColors(next)
  }

  const handlePanelOpenChange = (open: boolean) => {
    setIsPanelOpen(open)

    if (open) {
      setPendingRecentColor(null)
      return
    }

    const pending = pendingRecentColor()
    if (pending) {
      updateRecentColors(pending)
      setPendingRecentColor(null)
    }
  }

  createEffect(() => {
    const next = currentValue()
    setPanelColor(toKobalteColor(next))
    setHexColor(next === 'transparent' ? FALLBACK_COLOR : next)
  })

  createEffect(() => {
    const persisted = localStorage.getItem(getRecentColorStorageKey(props.mode, props.canvasId))
    if (!persisted) {
      setRecentColors([])
      return
    }

    try {
      const parsed = JSON.parse(persisted)
      if (!Array.isArray(parsed)) {
        setRecentColors([])
        return
      }

      const valid = parsed
        .filter((item) => typeof item === 'string')
        .map((item) => normalizeColorValue(item))
        .filter((item) => item !== 'transparent')
        .slice(0, MAX_RECENT_COLORS)

      setRecentColors(valid)
    } catch {
      setRecentColors([])
    }
  })

  const handleColorAreaChange = (nextColor: ReturnType<typeof parseColor>) => {
    const nextHex = nextColor.toString('hex')
    setPanelColor(nextColor)
    setHexColor(nextHex)
    applyColor(nextHex)
  }

  const handleHexChange = (value: string) => {
    setHexColor(value)

    try {
      const parsed = parseColor(value)
      setPanelColor(parsed)
      applyColor(parsed.toString('hex'))
    } catch {
      // Keep text input responsive while typing incomplete hex values.
    }
  }

  const renderSwatch = (value: string) => {
    if (value === 'transparent') {
      return (
        <div
          class="h-full w-full"
          style={{
            'background-image': 'linear-gradient(45deg, #d4d4d4 25%, transparent 25%, transparent 75%, #d4d4d4 75%), linear-gradient(45deg, #d4d4d4 25%, transparent 25%, transparent 75%, #d4d4d4 75%)',
            'background-size': '8px 8px',
            'background-position': '0 0, 4px 4px',
          }}
        />
      )
    }

    return (
      <ColorSwatch
        value={toKobalteColor(value)}
        class="block h-full w-full"
        colorName={value}
      />
    )
  }

  return (
    <div class="flex h-7 items-center gap-1">
      <div class="flex items-center gap-1">
        <For each={quickColors()}>
          {(color) => (
            <button
              type="button"
              class="h-7 w-7 overflow-hidden border border-border transition-colors hover:border-amber-500"
              classList={{
                'ring-1 ring-amber-500 ring-offset-1 ring-offset-card': currentValue() === normalizeColorValue(color.value),
              }}
              title={color.name}
              onClick={() => applyColor(color.value)}
            >
              {renderSwatch(color.value)}
            </button>
          )}
        </For>
      </div>

      <div class="h-5 w-px self-center bg-border" aria-hidden="true" />

      <Menubar class="flex h-7 items-center">
        <Menubar.Menu placement="right-start" gutter={10} onOpenChange={handlePanelOpenChange}>
          <Menubar.Trigger
            as="button"
            type="button"
            class="flex h-7 w-7 items-center justify-center overflow-hidden border border-border transition-colors hover:border-amber-500 data-[expanded]:border-amber-500"
            title="Open color panel"
          >
            {renderSwatch(currentSwatchValue())}
          </Menubar.Trigger>

          <Menubar.Portal>
            <Menubar.Content class="z-50 w-[230px] bg-popover border border-border shadow-md p-3 flex flex-col gap-3 data-[expanded]:animate-in data-[expanded]:fade-in data-[expanded]:slide-in-from-left-1 duration-100">
              <div class="flex flex-col gap-1">
                <span class="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Last used</span>
                <div class="grid grid-cols-6 gap-1">
                  <For each={Array.from({ length: MAX_RECENT_COLORS }, (_, index) => recentColors()[index] ?? null)}>
                    {(color) => (
                      <button
                        type="button"
                        class="h-7 w-7 overflow-hidden border border-border"
                        classList={{
                          'hover:border-amber-500': color !== null,
                          'ring-1 ring-amber-500 ring-offset-1 ring-offset-popover': color !== null && currentValue() === color,
                          'opacity-45': color === null,
                        }}
                        title={color ?? 'Empty slot'}
                        disabled={color === null}
                        onClick={() => color && applyColor(color)}
                      >
                        <Show
                          when={color !== null}
                          fallback={<div class="h-full w-full bg-background" />}
                        >
                          {renderSwatch(color as string)}
                        </Show>
                      </button>
                    )}
                  </For>
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <span class="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Colors</span>
                <div class="grid grid-cols-5 gap-1">
                  <For each={panelColors()}>
                    {(color) => (
                      <button
                        type="button"
                        class="h-7 w-7 overflow-hidden border border-border hover:border-amber-500"
                        classList={{
                          'ring-1 ring-amber-500 ring-offset-1 ring-offset-popover': currentValue() === normalizeColorValue(color.value),
                        }}
                        title={color.name}
                        onClick={() => applyColor(color.value)}
                      >
                        {renderSwatch(color.value)}
                      </button>
                    )}
                  </For>
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <span class="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Shades</span>
                <div class="grid grid-cols-5 gap-1">
                  <For each={shades()}>
                    {(color) => (
                      <button
                        type="button"
                        class="h-7 w-7 overflow-hidden border border-border hover:border-amber-500"
                        classList={{
                          'ring-1 ring-amber-500 ring-offset-1 ring-offset-popover': currentValue() === color,
                        }}
                        title={color}
                        onClick={() => applyColor(color)}
                      >
                        {renderSwatch(color)}
                      </button>
                    )}
                  </For>
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <span class="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Picker</span>
                <ColorArea
                  value={panelColor()}
                  onChange={handleColorAreaChange}
                  colorSpace="hsb"
                  xChannel="saturation"
                  yChannel="brightness"
                  class="w-full"
                >
                  <ColorArea.Background class="relative h-24 w-full border border-border overflow-hidden">
                    <ColorArea.Thumb class="absolute h-3 w-3 border-2 border-white shadow-sm -translate-x-1/2 -translate-y-1/2">
                      <ColorArea.HiddenInputX />
                      <ColorArea.HiddenInputY />
                    </ColorArea.Thumb>
                  </ColorArea.Background>
                </ColorArea>
              </div>

              <div class="flex flex-col gap-1">
                <span class="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Hex code</span>
                <ColorField value={hexColor()} onChange={handleHexChange}>
                  <ColorField.Input class="w-full h-8 border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-amber-500" />
                </ColorField>
              </div>
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>
      </Menubar>
    </div>
  )
}
