import type { TThemeColorPickerPalette } from "@vibecanvas/service-theme";
import { Show, createMemo } from "solid-js";
import { CapPicker } from "./CapPicker";
import { ColorPicker } from "./ColorPicker";
import { FontFamilyPicker } from "./FontFamilyPicker";
import { FontSizePicker } from "./FontSizePicker";
import { LineTypePicker } from "./LineTypePicker";
import { OpacitySlider } from "./OpacitySlider";
import { StrokeWidthPicker } from "./StrokeWidthPicker";
import { TextAlignPicker } from "./TextAlignPicker";
import { VerticalAlignPicker } from "./VerticalAlignPicker";
import { DEFAULT_STROKE_WIDTHS, type TCapStyle, type TFontFamily, type TLineType, type TStrokeWidthOption } from "./types";
import type { TFontSizePreset } from "../../core/fn.text-style";
import type { TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";

export type TSelectionStyleMenuSections = {
  showFillPicker: boolean;
  showStrokeColorPicker: boolean;
  showStrokeWidthPicker: boolean;
  showTextPickers: boolean;
  showOpacityPicker: boolean;
  showLineTypePicker: boolean;
  showStartCapPicker: boolean;
  showEndCapPicker: boolean;
};

export type TSelectionStyleMenuValues = {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  fontFamily?: TFontFamily;
  fontSizePreset?: TFontSizePreset;
  textAlign?: TTextData["textAlign"];
  verticalAlign?: TTextData["verticalAlign"];
  lineType?: TLineType;
  startCap?: TCapStyle;
  endCap?: TCapStyle;
};

const sectionStyle = {
  display: "flex",
  "flex-direction": "column",
  gap: "0.25rem",
};

const labelStyle = {
  "font-size": "10px",
  color: "var(--muted-foreground)",
  "font-family": "var(--font-mono)",
};

export function SelectionStyleMenu(props: {
  visible: () => boolean;
  sections: () => TSelectionStyleMenuSections;
  values: () => TSelectionStyleMenuValues;
  strokeWidthOptions?: () => TStrokeWidthOption[];
  colorPalette: () => TThemeColorPickerPalette;
  onFillChange: (color: string) => void;
  onStrokeChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onOpacityChange: (opacity: number) => void;
  onFontFamilyChange: (fontFamily: TFontFamily) => void;
  onFontSizePresetChange?: (preset: TFontSizePreset) => void;
  onTextAlignChange?: (textAlign: TTextData["textAlign"]) => void;
  onVerticalAlignChange?: (verticalAlign: TTextData["verticalAlign"]) => void;
  onLineTypeChange: (lineType: TLineType) => void;
  onStartCapChange: (capStyle: TCapStyle) => void;
  onEndCapChange: (capStyle: TCapStyle) => void;
}) {
  const shouldShow = createMemo(() => props.visible());

  return (
    <Show when={shouldShow()}>
      <div
        style={{
          position: "absolute",
          left: "0.75rem",
          top: "0.75rem",
          "z-index": 40,
          "pointer-events": "none",
        }}
      >
        <div
          style={{
            width: "18.5rem",
            height: "24rem",
            border: "1px solid var(--border)",
            background: "var(--card)",
            "box-shadow": "0 6px 18px rgba(0, 0, 0, 0.12)",
            "pointer-events": "auto",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              padding: "0.75rem",
              display: "flex",
              "flex-direction": "column",
              gap: "0.75rem",
              overflow: "auto",
            }}
          >
            <Show when={props.sections().showFillPicker}>
              <div style={sectionStyle}>
                <span style={labelStyle}>FILL</span>
                <ColorPicker
                  value={props.values().fillColor}
                  onChange={props.onFillChange}
                  showTransparent
                  mode="fill"
                  palette={props.colorPalette()}
                />
              </div>
            </Show>

            <Show when={props.sections().showStrokeColorPicker}>
              <div style={sectionStyle}>
                <span style={labelStyle}>COLOR</span>
                <ColorPicker
                  value={props.values().strokeColor}
                  onChange={props.onStrokeChange}
                  mode="stroke"
                  palette={props.colorPalette()}
                />
              </div>
            </Show>

            <Show when={props.sections().showStrokeWidthPicker}>
              <div style={sectionStyle}>
                <span style={labelStyle}>WIDTH</span>
                <StrokeWidthPicker
                  options={props.strokeWidthOptions?.() ?? [...DEFAULT_STROKE_WIDTHS]}
                  value={props.values().strokeWidth ?? 2}
                  onChange={props.onStrokeWidthChange}
                />
              </div>
            </Show>

            <Show when={props.sections().showTextPickers}>
              <div style={{ display: "flex", "flex-direction": "column", gap: "0.75rem" }}>
                <div style={sectionStyle}>
                  <span style={labelStyle}>FONT</span>
                  <FontFamilyPicker
                    value={props.values().fontFamily}
                    onChange={props.onFontFamilyChange}
                  />
                </div>

                <div style={sectionStyle}>
                  <span style={labelStyle}>SIZE</span>
                  <FontSizePicker
                    value={props.values().fontSizePreset}
                    onChange={(preset) => props.onFontSizePresetChange?.(preset)}
                  />
                </div>

                <div style={sectionStyle}>
                  <span style={labelStyle}>ALIGN</span>
                  <TextAlignPicker
                    value={props.values().textAlign}
                    onChange={(textAlign) => props.onTextAlignChange?.(textAlign)}
                  />
                </div>

                <div style={sectionStyle}>
                  <span style={labelStyle}>VERTICAL</span>
                  <VerticalAlignPicker
                    value={props.values().verticalAlign}
                    onChange={(verticalAlign) => props.onVerticalAlignChange?.(verticalAlign)}
                  />
                </div>
              </div>
            </Show>

            <Show when={props.sections().showLineTypePicker}>
              <div style={sectionStyle}>
                <span style={labelStyle}>CURVE</span>
                <LineTypePicker
                  value={props.values().lineType}
                  onChange={props.onLineTypeChange}
                />
              </div>
            </Show>

            <Show when={props.sections().showStartCapPicker}>
              <div style={sectionStyle}>
                <span style={labelStyle}>START</span>
                <CapPicker
                  label="START"
                  value={props.values().startCap}
                  onChange={props.onStartCapChange}
                />
              </div>
            </Show>

            <Show when={props.sections().showEndCapPicker}>
              <div style={sectionStyle}>
                <span style={labelStyle}>END</span>
                <CapPicker
                  label="END"
                  value={props.values().endCap}
                  onChange={props.onEndCapChange}
                />
              </div>
            </Show>

            <Show when={props.sections().showOpacityPicker}>
              <div style={sectionStyle}>
                <span style={labelStyle}>OPACITY</span>
                <OpacitySlider
                  value={props.values().opacity}
                  onChange={props.onOpacityChange}
                />
              </div>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}
