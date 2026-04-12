import { For } from "solid-js";
import { CAP_STYLES, type TCapStyle } from "./types";

export function CapPicker(props: {
  value: TCapStyle | undefined;
  onChange: (capStyle: TCapStyle) => void;
  label: "START" | "END";
}) {
  const getIcon = (value: TCapStyle) => {
    switch (value) {
      case "none":
        return "○";
      case "arrow":
        return "▸";
      case "dot":
        return "●";
      case "diamond":
        return "◆";
    }
  };

  return (
    <div class="flex gap-0.5">
      <For each={CAP_STYLES}>
        {(option) => (
          <button
            type="button"
            class="w-5 h-5 flex items-center justify-center border border-border hover:bg-accent hover:text-accent-foreground transition-colors text-[9px]"
            classList={{
              "bg-primary/15 text-foreground border-primary": props.value === option.value,
            }}
            title={`${props.label}: ${option.name}`}
            onClick={() => props.onChange(option.value)}
          >
            {getIcon(option.value)}
          </button>
        )}
      </For>
    </div>
  );
}
