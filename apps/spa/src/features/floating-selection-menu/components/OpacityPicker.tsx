import { For } from 'solid-js'

interface Props {
  value: number | undefined
  onChange: (opacity: number) => void
}

const OPACITY_OPTIONS = [
  { name: '100%', value: 1 },
  { name: '75%', value: 0.75 },
  { name: '50%', value: 0.5 },
  { name: '25%', value: 0.25 },
] as const

export function OpacityPicker(props: Props) {
  const current = () => props.value ?? 1

  return (
    <div class="flex gap-0.5">
      <For each={OPACITY_OPTIONS}>
        {(option) => (
          <button
            type="button"
            class="h-5 min-w-8 border border-border px-1 text-[9px] font-mono transition-colors hover:bg-stone-200 dark:hover:bg-stone-800"
            classList={{
              'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500': current() === option.value,
            }}
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
