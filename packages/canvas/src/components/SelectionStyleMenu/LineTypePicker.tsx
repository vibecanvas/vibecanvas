import { For } from "solid-js";
import { LINE_TYPES, type TLineType } from "./types";

export function LineTypePicker(props: {
  value: TLineType | undefined;
  onChange: (lineType: TLineType) => void;
}) {
  return (
    <div class="flex gap-0.5">
      <For each={LINE_TYPES}>
        {(option) => (
          <button
            type="button"
            class="w-8 h-5 flex items-center justify-center border border-border hover:bg-accent hover:text-accent-foreground transition-colors text-[9px] font-mono"
            classList={{
              "bg-primary/15 text-foreground border-primary": props.value === option.value,
            }}
            title={option.name}
            onClick={() => props.onChange(option.value)}
          >
            {option.value === "straight" ? "—" : "~"}
          </button>
        )}
      </For>
    </div>
  );
}
