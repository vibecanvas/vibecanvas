import { For } from "solid-js";
import { fnGetFontSizePresetOptions, type TFontSizePreset } from "../../core/fn.text-style";

export function FontSizePicker(props: {
  value: TFontSizePreset | undefined;
  onChange: (preset: TFontSizePreset) => void;
}) {
  const options = fnGetFontSizePresetOptions();

  return (
    <div
      style={{
        display: "grid",
        "grid-template-columns": "repeat(4, minmax(0, 1fr))",
        gap: "0.25rem",
      }}
    >
      <For each={options}>
        {(option) => (
          <button
            type="button"
            style={{
              height: "1.875rem",
              border: `1px solid ${props.value === option.value ? "var(--primary)" : "var(--border)"}`,
              background: props.value === option.value ? "var(--accent)" : "var(--background)",
              color: "var(--foreground)",
              "font-size": "0.875rem",
              "font-weight": 500,
            }}
            title={`${option.label} (${option.fontSize}px baseline)`}
            onClick={() => props.onChange(option.value)}
          >
            {option.label}
          </button>
        )}
      </For>
    </div>
  );
}
