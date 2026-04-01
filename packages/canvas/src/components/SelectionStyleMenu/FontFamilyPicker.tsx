import { For } from "solid-js";
import { FONT_FAMILIES, type TFontFamily } from "./types";

export function FontFamilyPicker(props: {
  value: TFontFamily | undefined;
  onChange: (family: TFontFamily) => void;
}) {
  return (
    <div class="grid grid-cols-3 gap-0.5">
      <For each={FONT_FAMILIES}>
        {(option) => (
          <button
            type="button"
            class="h-6 min-w-[3.5rem] border border-border px-1 text-[9px] transition-colors hover:bg-stone-200"
            classList={{
              "bg-amber-500/20 text-amber-700 border-amber-500": props.value === option.value,
            }}
            title={option.name}
            onClick={() => props.onChange(option.value)}
          >
            {option.name}
          </button>
        )}
      </For>
    </div>
  );
}
