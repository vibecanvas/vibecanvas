import { For } from 'solid-js'
import { FONT_FAMILIES, type TFontFamily } from '../types'

interface Props {
  value: TFontFamily | undefined
  onChange: (family: TFontFamily) => void
}

export function FontFamilyPicker(props: Props) {
  return (
    <div class="grid grid-cols-3 gap-0.5">
      <For each={FONT_FAMILIES}>
        {(option) => (
          <button
            type="button"
            class="h-6 min-w-[3.5rem] border border-border px-1 text-[9px] transition-colors hover:bg-stone-200 dark:hover:bg-stone-800"
            classList={{
              'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500': props.value === option.value,
            }}
            style={{ 'font-family': option.value }}
            title={option.name}
            onClick={() => props.onChange(option.value)}
          >
            {option.name}
          </button>
        )}
      </For>
    </div>
  )
}
