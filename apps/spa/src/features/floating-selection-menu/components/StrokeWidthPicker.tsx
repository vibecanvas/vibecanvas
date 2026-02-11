import { For } from 'solid-js'
import { STROKE_WIDTHS } from '../types'

interface Props {
  value: number
  onChange: (width: number) => void
}

export function StrokeWidthPicker(props: Props) {
  return (
    <div class="flex gap-0.5">
      <For each={STROKE_WIDTHS}>
        {(option) => (
          <button
            type="button"
            class="w-6 h-5 flex items-center justify-center border border-border hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
            classList={{
              'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500': props.value === option.value,
            }}
            title={option.name}
            onClick={() => props.onChange(option.value)}
          >
            <div
              class="bg-current"
              style={{ width: '12px', height: `${option.value}px` }}
            />
          </button>
        )}
      </For>
    </div>
  )
}
