import { For } from 'solid-js'
import { LINE_TYPES, type TLineType } from '../types'

interface Props {
  value: TLineType | undefined
  onChange: (lineType: TLineType) => void
}

export function LineTypePicker(props: Props) {
  return (
    <div class="flex gap-0.5">
      <For each={LINE_TYPES}>
        {(option) => (
          <button
            type="button"
            class="w-8 h-5 flex items-center justify-center border border-border hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors text-[9px] font-mono"
            classList={{
              'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500': props.value === option.value,
            }}
            title={option.name}
            onClick={() => props.onChange(option.value)}
          >
            {option.value === 'straight' ? '—' : '~'}
          </button>
        )}
      </For>
    </div>
  )
}
