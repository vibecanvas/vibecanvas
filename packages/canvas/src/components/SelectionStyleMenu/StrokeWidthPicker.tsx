import { For } from "solid-js";
import { STROKE_WIDTHS } from "./types";

export function StrokeWidthPicker(props: {
  value: number;
  onChange: (width: number) => void;
}) {
  return (
    <div class="flex gap-0.5">
      <For each={STROKE_WIDTHS}>
        {(option) => (
          <button
            type="button"
            class="w-6 h-5 flex items-center justify-center border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
            classList={{
              "bg-primary/15 text-foreground border-primary": props.value === option.value,
            }}
            title={option.name}
            onClick={() => props.onChange(option.value)}
          >
            <div class="bg-current" style={{ width: "12px", height: `${option.value}px` }} />
          </button>
        )}
      </For>
    </div>
  );
}
