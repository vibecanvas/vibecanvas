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

function renderSwatch(value: string) {
  if (value === "transparent") {
    return (
      <div class="relative h-full w-full bg-background">
        <div class="absolute inset-0 bg-muted opacity-40" />
        <div class="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">×</div>
      </div>
    );
  }

  return <div class="h-full w-full" style={{ background: value }} />;
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
    <div class="relative flex h-7 items-center gap-1">
      <div class="flex items-center gap-1">
        <For each={quickColors()}>
          {(color) => (
            <button
              type="button"
              class="h-7 w-7 overflow-hidden border border-border transition-colors hover:border-primary"
              classList={{
                "ring-1 ring-primary ring-offset-1 ring-offset-card": currentValue() === normalizeColorValue(color.value),
              }}
              title={color.name}
              onClick={() => applyColor(color.value)}
            >
              {renderSwatch(color.value)}
            </button>
          )}
        </For>
      </div>

      <div class="h-5 w-px self-center bg-border" aria-hidden="true" />

      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center overflow-hidden border border-border transition-colors hover:border-primary"
        classList={{ "border-primary": open() }}
        title="Open color panel"
        onClick={() => setOpen((value) => !value)}
      >
        {renderSwatch(currentSwatchValue())}
      </button>

      <Show when={open()}>
        <div class="absolute left-full top-0 ml-2 z-50 w-[230px] bg-popover border border-border shadow-md p-3 flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Last used</span>
            <div class="grid grid-cols-6 gap-1">
              <For each={Array.from({ length: MAX_RECENT_COLORS }, (_, index) => recentColors()[index] ?? null)}>
                {(color) => (
                  <button
                    type="button"
                    class="h-7 w-7 overflow-hidden border border-border"
                    classList={{
                      "hover:border-primary": color !== null,
                      "ring-1 ring-primary ring-offset-1 ring-offset-popover": color !== null && currentValue() === color,
                      "opacity-45": color === null,
                    }}
                    title={color ?? "Empty slot"}
                    disabled={color === null}
                    onClick={() => color && applyColor(color)}
                  >
                    <Show when={color !== null} fallback={<div class="h-full w-full bg-background" />}>
                      {renderSwatch(color as string)}
                    </Show>
                  </button>
                )}
              </For>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Colors</span>
            <div class="grid grid-cols-5 gap-1">
              <For each={panelColors()}>
                {(color) => (
                  <button
                    type="button"
                    class="h-7 w-7 overflow-hidden border border-border hover:border-primary"
                    classList={{
                      "ring-1 ring-primary ring-offset-1 ring-offset-popover": currentValue() === normalizeColorValue(color.value),
                    }}
                    title={color.name}
                    onClick={() => applyColor(color.value)}
                  >
                    {renderSwatch(color.value)}
                  </button>
                )}
              </For>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Shades</span>
            <div class="grid grid-cols-5 gap-1">
              <For each={shades()}>
                {(color) => (
                  <button
                    type="button"
                    class="h-7 w-7 overflow-hidden border border-border hover:border-primary"
                    classList={{
                      "ring-1 ring-primary ring-offset-1 ring-offset-popover": currentValue() === color,
                    }}
                    title={color}
                    onClick={() => applyColor(color)}
                  >
                    {renderSwatch(color)}
                  </button>
                )}
              </For>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Picker</span>
            <input
              type="color"
              class="h-24 w-full border border-border bg-background"
              value={hexInput()}
              onInput={(event) => {
                const next = normalizeColorValue(event.currentTarget.value);
                setHexInput(next);
                applyColor(next);
              }}
            />
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Hex code</span>
            <input
              value={hexInput()}
              class="w-full h-8 border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
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
