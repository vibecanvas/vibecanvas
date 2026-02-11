import { For } from 'solid-js'
import { COLOR_PALETTE } from '../types'

interface Props {
  value: string | undefined
  onChange: (color: string) => void
  showTransparent?: boolean
}

export function ColorPicker(props: Props) {
  const colors = () => props.showTransparent
    ? [...COLOR_PALETTE, { name: 'Transparent', value: 'transparent' }]
    : COLOR_PALETTE

  return (
    <div class="grid grid-cols-4 gap-0.5">
      <For each={colors()}>
        {(color) => (
          <button
            type="button"
            class="w-5 h-5 border border-border hover:border-amber-500 transition-colors"
            classList={{
              'ring-1 ring-amber-500 ring-offset-1': props.value === color.value,
            }}
            style={{
              'background-color': color.value === 'transparent' ? undefined : color.value,
              'background-image': color.value === 'transparent'
                ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)'
                : undefined,
              'background-size': '6px 6px',
              'background-position': '0 0, 3px 3px',
            }}
            title={color.name}
            onClick={() => props.onChange(color.value)}
          />
        )}
      </For>
    </div>
  )
}
