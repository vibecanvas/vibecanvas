import { Show, createMemo } from "solid-js";
import { ColorPicker } from "./ColorPicker";
import { FontFamilyPicker } from "./FontFamilyPicker";
import { OpacitySlider } from "./OpacitySlider";
import { StrokeWidthPicker } from "./StrokeWidthPicker";
import type { TFontFamily } from "./types";

export type TSelectionStyleMenuSections = {
  showFillPicker: boolean;
  showStrokeColorPicker: boolean;
  showStrokeWidthPicker: boolean;
  showTextPickers: boolean;
  showOpacityPicker: boolean;
};

export type TSelectionStyleMenuValues = {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  fontFamily?: TFontFamily;
};

export function SelectionStyleMenu(props: {
  visible: () => boolean;
  sections: () => TSelectionStyleMenuSections;
  values: () => TSelectionStyleMenuValues;
  colorStorageKey?: string | null;
  onFillChange: (color: string) => void;
  onStrokeChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onOpacityChange: (opacity: number) => void;
  onFontFamilyChange: (fontFamily: TFontFamily) => void;
}) {
  const shouldShow = createMemo(() => props.visible());

  return (
    <Show when={shouldShow()}>
      <div class="absolute left-3 top-1/2 -translate-y-1/2 z-40 pointer-events-none">
        <div class="pointer-events-auto bg-card border border-border shadow-md p-2 flex flex-col gap-3">
          <Show when={props.sections().showFillPicker}>
            <div class="flex flex-col gap-1">
              <span class="text-[10px] text-muted-foreground font-mono">FILL</span>
              <ColorPicker
                value={props.values().fillColor}
                onChange={props.onFillChange}
                showTransparent
                mode="fill"
                storageKey={props.colorStorageKey ? `${props.colorStorageKey}:fill` : null}
              />
            </div>
          </Show>

          <Show when={props.sections().showStrokeColorPicker}>
            <div class="flex flex-col gap-1">
              <span class="text-[10px] text-muted-foreground font-mono">COLOR</span>
              <ColorPicker
                value={props.values().strokeColor}
                onChange={props.onStrokeChange}
                mode="stroke"
                storageKey={props.colorStorageKey ? `${props.colorStorageKey}:stroke` : null}
              />
            </div>
          </Show>

          <Show when={props.sections().showStrokeWidthPicker}>
            <div class="flex flex-col gap-1">
              <span class="text-[10px] text-muted-foreground font-mono">WIDTH</span>
              <StrokeWidthPicker
                value={props.values().strokeWidth ?? 2}
                onChange={props.onStrokeWidthChange}
              />
            </div>
          </Show>

          <Show when={props.sections().showTextPickers}>
            <div class="flex flex-col gap-1">
              <span class="text-[10px] text-muted-foreground font-mono">FONT</span>
              <FontFamilyPicker
                value={props.values().fontFamily}
                onChange={props.onFontFamilyChange}
              />
            </div>
          </Show>

          <Show when={props.sections().showOpacityPicker}>
            <div class="flex flex-col gap-1">
              <span class="text-[10px] text-muted-foreground font-mono">OPACITY</span>
              <OpacitySlider
                value={props.values().opacity}
                onChange={props.onOpacityChange}
              />
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}
