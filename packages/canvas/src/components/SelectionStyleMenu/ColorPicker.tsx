import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { COLOR_PANEL_COLORS, FILL_QUICK_COLORS, STROKE_QUICK_COLORS, getRecentColorStorageKey } from "./types";

type TMode = "fill" | "stroke";

const FALLBACK_COLOR = "#1f1f22";
const MAX_RECENT_COLORS = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeColorValue(value: string | undefined): string {
  if (!value) return FALLBACK_COLOR;
  if (value === "transparent") return "transparent";

  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;
  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    return `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
  }
  return FALLBACK_COLOR;
}

function hexToRgb(hex: string) {
  const normalized = normalizeColorValue(hex);
  if (normalized === "transparent") return { r: 31, g: 31, b: 34 };
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsb(r: number, g: number, b: number) {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === nr) h = 60 * (((ng - nb) / delta) % 6);
    else if (max === ng) h = 60 * (((nb - nr) / delta) + 2);
    else h = 60 * (((nr - ng) / delta) + 4);
  }

  if (h < 0) h += 360;
  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

function hsbToHex(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
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

function renderSwatch(value: string) {
  if (value === "transparent") {
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

  return <div style={{ width: "100%", height: "100%", background: value }} />;
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
  storageKey?: string | null;
}) {
  const [open, setOpen] = createSignal(false);
  const [recentColors, setRecentColors] = createSignal<string[]>([]);
  const [hexInput, setHexInput] = createSignal(FALLBACK_COLOR);

  const quickColors = createMemo(() => props.mode === "fill" ? FILL_QUICK_COLORS : STROKE_QUICK_COLORS);
  const currentValue = createMemo(() => normalizeColorValue(props.value));
  const currentSwatchValue = createMemo(() => currentValue() === "transparent" ? FALLBACK_COLOR : currentValue());
  const persistKey = createMemo(() => props.storageKey ?? getRecentColorStorageKey(props.mode, null));
  const panelColors = createMemo(() => {
    if (props.showTransparent) return COLOR_PANEL_COLORS;
    return COLOR_PANEL_COLORS.map((color) => color.value === "transparent" ? { name: "White", value: "#ffffff" } : color);
  });
  const shades = createMemo(() => {
    const { r, g, b } = hexToRgb(currentSwatchValue());
    const base = rgbToHsb(r, g, b);
    const saturation = clamp(base.s * 100, 8, 100);
    const saturationSteps = [
      clamp(saturation * 0.35, 6, 100),
      clamp(saturation * 0.55, 8, 100),
      clamp(saturation * 0.75, 10, 100),
      clamp(saturation * 0.95, 12, 100),
      clamp(saturation * 1.1, 14, 100),
    ];
    const brightnessSteps = [96, 84, 70, 56, 42];

    return brightnessSteps.map((brightness, index) => hsbToHex(base.h, saturationSteps[index] / 100, brightness / 100));
  });

  const updateRecentColors = (color: string) => {
    if (color === "transparent") return;
    const next = [color, ...recentColors().filter((item) => item !== color)].slice(0, MAX_RECENT_COLORS);
    setRecentColors(next);
    localStorage.setItem(persistKey(), JSON.stringify(next));
  };

  const applyColor = (value: string) => {
    const normalized = normalizeColorValue(value);
    const applied = normalized === "transparent" ? "transparent" : normalized;
    props.onChange(applied);
    setHexInput(applied === "transparent" ? FALLBACK_COLOR : applied);
    updateRecentColors(applied);
  };

  createEffect(() => {
    const next = currentValue();
    setHexInput(next === "transparent" ? FALLBACK_COLOR : next);
  });

  createEffect(() => {
    const persisted = localStorage.getItem(persistKey());
    if (!persisted) {
      setRecentColors([]);
      return;
    }

    try {
      const parsed = JSON.parse(persisted);
      if (!Array.isArray(parsed)) {
        setRecentColors([]);
        return;
      }

      setRecentColors(parsed.filter((item) => typeof item === "string").map((item) => normalizeColorValue(item)).filter((item) => item !== "transparent").slice(0, MAX_RECENT_COLORS));
    } catch {
      setRecentColors([]);
    }
  });

  return (
    <div style={{ position: "relative", display: "flex", height: "1.75rem", "align-items": "center", gap: "0.25rem" }}>
      <div style={{ display: "flex", "align-items": "center", gap: "0.25rem" }}>
        <For each={quickColors()}>
          {(color) => (
            <button
              type="button"
              style={swatchButtonStyle({ selected: currentValue() === normalizeColorValue(color.value) })}
              title={color.name}
              onClick={() => applyColor(color.value)}
            >
              {renderSwatch(color.value)}
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
        {renderSwatch(currentSwatchValue())}
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
          <div style={{ display: "flex", "flex-direction": "column", gap: "0.25rem" }}>
            {sectionTitle("Last used")}
            <div style={{ display: "grid", "grid-template-columns": "repeat(6, minmax(0, 1fr))", gap: "0.25rem" }}>
              <For each={Array.from({ length: MAX_RECENT_COLORS }, (_, index) => recentColors()[index] ?? null)}>
                {(color) => (
                  <button
                    type="button"
                    style={swatchButtonStyle({ selected: color !== null && currentValue() === color, disabled: color === null })}
                    title={color ?? "Empty slot"}
                    disabled={color === null}
                    onClick={() => color && applyColor(color)}
                  >
                    <Show when={color !== null} fallback={<div style={{ width: "100%", height: "100%", background: "var(--background)" }} />}>
                      {renderSwatch(color as string)}
                    </Show>
                  </button>
                )}
              </For>
            </div>
          </div>

          <div style={{ display: "flex", "flex-direction": "column", gap: "0.25rem" }}>
            {sectionTitle("Colors")}
            <div style={{ display: "grid", "grid-template-columns": "repeat(5, minmax(0, 1fr))", gap: "0.25rem" }}>
              <For each={panelColors()}>
                {(color) => (
                  <button
                    type="button"
                    style={swatchButtonStyle({ selected: currentValue() === normalizeColorValue(color.value) })}
                    title={color.name}
                    onClick={() => applyColor(color.value)}
                  >
                    {renderSwatch(color.value)}
                  </button>
                )}
              </For>
            </div>
          </div>

          <div style={{ display: "flex", "flex-direction": "column", gap: "0.25rem" }}>
            {sectionTitle("Shades")}
            <div style={{ display: "grid", "grid-template-columns": "repeat(5, minmax(0, 1fr))", gap: "0.25rem" }}>
              <For each={shades()}>
                {(color) => (
                  <button
                    type="button"
                    style={swatchButtonStyle({ selected: currentValue() === color })}
                    title={color}
                    onClick={() => applyColor(color)}
                  >
                    {renderSwatch(color)}
                  </button>
                )}
              </For>
            </div>
          </div>

          <div style={{ display: "flex", "flex-direction": "column", gap: "0.25rem" }}>
            {sectionTitle("Picker")}
            <input
              type="color"
              style={{ height: "6rem", width: "100%", border: "1px solid var(--border)", background: "var(--background)" }}
              value={hexInput()}
              onInput={(event) => {
                const next = normalizeColorValue(event.currentTarget.value);
                setHexInput(next);
                applyColor(next);
              }}
            />
          </div>

          <div style={{ display: "flex", "flex-direction": "column", gap: "0.25rem" }}>
            {sectionTitle("Hex code")}
            <input
              value={hexInput()}
              style={{
                width: "100%",
                height: "2rem",
                border: "1px solid var(--input)",
                background: "var(--background)",
                padding: "0 0.5rem",
                "font-size": "0.75rem",
                color: "var(--foreground)",
                outline: "none",
              }}
              onInput={(event) => setHexInput(event.currentTarget.value)}
              onChange={(event) => {
                const next = normalizeColorValue(event.currentTarget.value);
                setHexInput(next);
                applyColor(next);
              }}
            />
          </div>
        </div>
      </Show>
    </div>
  );
}
