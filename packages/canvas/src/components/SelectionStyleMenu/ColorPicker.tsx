import type { TThemeColorPickerPalette, TThemeColorSwatch } from "@vibecanvas/service-theme";
import { For, Show, createMemo, createSignal } from "solid-js";

type TMode = "fill" | "stroke";

const FALLBACK_COLOR = "#1f1f22";

function normalizeSelectionValue(value: string | undefined) {
  if (value === "transparent") {
    return "@transparent";
  }

  return value ?? "";
}

function swatchButtonStyle(args: { selected: boolean; disabled?: boolean }) {
  return {
    width: "1.75rem",
    height: "1.75rem",
    overflow: "hidden",
    border: `1px solid ${args.selected ? "var(--primary)" : "var(--border)"}`,
    opacity: args.disabled ? 0.45 : 1,
  };
}

function renderSwatch(color: string, token?: string) {
  if (token === "@transparent" || color === "transparent") {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", background: "var(--background)" }}>
        <div style={{ position: "absolute", inset: 0, background: "var(--muted)", opacity: 0.4 }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            "font-size": "10px",
            color: "var(--muted-foreground)",
          }}
        >
          ×
        </div>
      </div>
    );
  }

  return <div style={{ width: "100%", height: "100%", background: color }} />;
}

function sectionTitle(title: string) {
  return (
    <span style={{ "font-size": "10px", "font-family": "var(--font-mono)", color: "var(--muted-foreground)", "text-transform": "uppercase", "letter-spacing": "0.04em" }}>
      {title}
    </span>
  );
}

export function ColorPicker(props: {
  value: string | undefined;
  onChange: (color: string) => void;
  showTransparent?: boolean;
  mode: TMode;
  palette: TThemeColorPickerPalette;
}) {
  const [open, setOpen] = createSignal(false);

  const quickColors = createMemo(() => {
    const next = props.mode === "fill" ? props.palette.fillQuick : props.palette.strokeQuick;
    return props.showTransparent ? next : next.filter((swatch) => swatch.token !== "@transparent");
  });
  const groups = createMemo(() => props.palette.groups);
  const swatchByToken = createMemo(() => {
    const entries = [...props.palette.fillQuick, ...props.palette.strokeQuick, ...props.palette.groups.flatMap((group) => group.swatches)];
    return new Map(entries.map((swatch) => [swatch.token, swatch]));
  });
  const currentValue = createMemo(() => normalizeSelectionValue(props.value));
  const currentSwatch = createMemo(() => swatchByToken().get(currentValue()));
  const currentSwatchColor = createMemo(() => {
    if (currentSwatch()) {
      return currentSwatch()!.color;
    }

    if (props.value === "transparent") {
      return "transparent";
    }

    return props.value ?? FALLBACK_COLOR;
  });

  const isSelected = (token: string) => currentValue() === normalizeSelectionValue(token);
  const applyColor = (swatch: TThemeColorSwatch) => {
    props.onChange(swatch.token);
  };

  return (
    <div style={{ position: "relative", display: "flex", height: "1.75rem", "align-items": "center", gap: "0.25rem" }}>
      <div style={{ display: "flex", "align-items": "center", gap: "0.25rem" }}>
        <For each={quickColors()}>
          {(swatch) => (
            <button
              type="button"
              style={swatchButtonStyle({ selected: isSelected(swatch.token) })}
              title={swatch.label}
              onClick={() => applyColor(swatch)}
            >
              {renderSwatch(swatch.color, swatch.token)}
            </button>
          )}
        </For>
      </div>

      <div aria-hidden="true" style={{ width: "1px", height: "1.25rem", background: "var(--border)" }} />

      <button
        type="button"
        style={swatchButtonStyle({ selected: open() })}
        title="Open color panel"
        onClick={() => setOpen((value) => !value)}
      >
        {renderSwatch(currentSwatchColor(), currentSwatch()?.token ?? currentValue())}
      </button>

      <Show when={open()}>
        <div
          style={{
            position: "absolute",
            left: "calc(100% + 0.5rem)",
            top: 0,
            width: "230px",
            border: "1px solid var(--border)",
            background: "var(--popover)",
            "box-shadow": "0 6px 18px rgba(0, 0, 0, 0.12)",
            padding: "0.75rem",
            display: "flex",
            "flex-direction": "column",
            gap: "0.75rem",
            "z-index": 50,
          }}
        >
          <For each={groups()}>
            {(group) => (
              <div style={{ display: "flex", "flex-direction": "column", gap: "0.25rem" }}>
                {sectionTitle(group.label)}
                <div style={{ display: "grid", "grid-template-columns": "repeat(5, minmax(0, 1fr))", gap: "0.25rem" }}>
                  <For each={group.swatches}>
                    {(swatch) => (
                      <button
                        type="button"
                        style={swatchButtonStyle({ selected: isSelected(swatch.token) })}
                        title={swatch.label}
                        onClick={() => applyColor(swatch)}
                      >
                        {renderSwatch(swatch.color, swatch.token)}
                      </button>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
