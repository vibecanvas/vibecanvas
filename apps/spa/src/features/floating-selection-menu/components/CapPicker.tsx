import { For } from 'solid-js'
import { CAP_STYLES, type TCapStyle } from '../types'

interface Props {
  value: TCapStyle | undefined
  onChange: (capStyle: TCapStyle) => void
  label: 'START' | 'END'
}

export function CapPicker(props: Props) {
  const getIcon = (value: TCapStyle) => {
    switch (value) {
      case 'none': return '○'
      case 'arrow': return '▸'
      case 'dot': return '●'
      case 'diamond': return '◆'
    }
  }

  return (
    <div class="flex gap-0.5">
      <For each={CAP_STYLES}>
        {(option) => (
          <button
            type="button"
            class="w-5 h-5 flex items-center justify-center border border-border hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors text-[9px]"
            classList={{
              'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500': props.value === option.value,
            }}
            title={`${props.label}: ${option.name}`}
            onClick={() => props.onChange(option.value)}
          >
            {getIcon(option.value)}
          </button>
        )}
      </For>
    </div>
  )
}
