export function OpacitySlider(props: {
  value: number | undefined;
  onChange: (opacity: number) => void;
}) {
  const percentValue = () => Math.round((props.value ?? 1) * 100);

  return (
    <div class="flex items-center gap-2">
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={percentValue()}
        class="w-28"
        style={{ accentColor: "var(--primary)" }}
        onInput={(event) => props.onChange(Number(event.currentTarget.value) / 100)}
      />
      <span class="w-9 text-right text-[10px] font-mono text-muted-foreground">{percentValue()}%</span>
    </div>
  );
}
