import * as Slider from '@kobalte/core/slider'

interface Props {
  value: number | undefined
  onChange: (opacity: number) => void
}

export function OpacitySlider(props: Props) {
  const percentValue = () => Math.round((props.value ?? 1) * 100)

  const handleChange = (next: number[]) => {
    const nextPercent = next[0] ?? percentValue()
    props.onChange(nextPercent / 100)
  }

  return (
    <Slider.Root
      value={[percentValue()]}
      onChange={handleChange}
      minValue={0}
      maxValue={100}
      step={1}
      class="flex items-center gap-2"
      getValueLabel={({ values }) => `${Math.round(values[0] ?? 0)}%`}
    >
      <Slider.Track class="relative h-2 w-28 border border-border bg-background">
        <Slider.Fill class="absolute h-full bg-amber-500/40" />
        <Slider.Thumb class="absolute top-1/2 block h-3 w-3 -translate-x-1/2 -translate-y-1/2 border border-amber-500 bg-card shadow-sm outline-none">
          <Slider.Input />
        </Slider.Thumb>
      </Slider.Track>
      <Slider.ValueLabel class="w-9 text-right text-[10px] font-mono text-muted-foreground" />
    </Slider.Root>
  )
}
