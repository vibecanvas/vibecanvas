import type { IPlugin } from "@vibecanvas/runtime";
import type Konva from "konva";
import { createComponent, createMemo, createSignal } from "solid-js";
import { render as renderSolid } from "solid-js/web";
import { SelectionStyleMenu } from "../../components/SelectionStyleMenu";
import type { ThemeService } from "@vibecanvas/service-theme";
import type { TCapStyle, TFontFamily, TLineType } from "../../components/SelectionStyleMenu/types";
import { fxResolveFocusedSelectionStyleElements } from "../../core/fx.resolve-selection-style-elements";
import { fxResolveSelectionStyleTextElements } from "../../core/fx.resolve-selection-style-text-elements";
import {
  fxGetSelectionStyleMenuSections,
  fxGetSelectionStyleMenuValues,
  fxGetSelectionStyleStrokeWidthOptions,
  type TSelectionStyleProperty,
} from "../../core/fn.selection-style-menu";
import { txApplySelectionStyleChange } from "../../core/tx.apply-selection-style-change";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { SceneService } from "../../new-services/scene/SceneService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { fxFindShape1dNodeById } from "../shape1d/fx.node";
import type { IHooks } from "../../runtime";

function mountSelectionStyleMenu(args: {
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: SceneService;
  selection: SelectionService;
  theme: ThemeService;
}) {
  const mountElement = args.render.container.ownerDocument.createElement("div");
  Object.assign(mountElement.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "50",
  });
  args.render.stage.container().appendChild(mountElement);

  const [version, setVersion] = createSignal(0);
  const syncVersion = () => {
    setVersion((value) => value + 1);
  };

  args.selection.hooks.change.tap(() => {
    syncVersion();
  });
  args.editor.hooks.editingTextChange.tap(() => {
    syncVersion();
  });
  args.editor.hooks.editingShape1dChange.tap(() => {
    syncVersion();
  });
  args.editor.hooks.toElementRegistryChange.tap(() => {
    syncVersion();
  });
  args.crdt.hooks.change.tap(() => {
    syncVersion();
  });
  args.theme.hooks.change.tap(() => {
    syncVersion();
  });

  const disposeRender = renderSolid(() => {
    const focusedId = createMemo(() => {
      version();
      return args.selection.focusedId;
    });
    const elements = createMemo(() => {
      return fxResolveFocusedSelectionStyleElements({
        editor: args.editor,
        render: args.render,
      }, {
        focusedId: focusedId(),
      });
    });
    const textElements = createMemo(() => {
      version();
      return fxResolveSelectionStyleTextElements({
        editor: args.editor,
        fxFindAttachedTextNodeByContainerId: (containerId) => {
          const node = args.render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
            return candidate instanceof args.render.Text && candidate.getAttr("vcContainerId") === containerId;
          });

          return node instanceof args.render.Text ? node : null;
        },
      }, {
        elements: elements(),
      });
    });
    const sections = createMemo(() => {
      return fxGetSelectionStyleMenuSections({
        elements: elements(),
        textElements: textElements(),
      });
    });
    const visible = createMemo(() => {
      const textareaMounted = args.render.stage.container().querySelector("textarea") !== null;
      const isEditingTextActive = args.editor.editingTextId !== null && textareaMounted;
      if (isEditingTextActive) {
        return false;
      }

      if (focusedId() === null) {
        return false;
      }

      const next = sections();
      const nextVisible = next.showFillPicker
        || next.showStrokeColorPicker
        || next.showStrokeWidthPicker
        || next.showTextPickers
        || next.showOpacityPicker
        || next.showLineTypePicker
        || next.showStartCapPicker
        || next.showEndCapPicker;

      return nextVisible;
    });
    const values = createMemo(() => {
      return fxGetSelectionStyleMenuValues({
        elements: elements(),
        textElements: textElements(),
      });
    });
    const strokeWidthOptions = createMemo(() => {
      return fxGetSelectionStyleStrokeWidthOptions(elements());
    });
    const colorPalette = createMemo(() => {
      version();
      return args.theme.getThemeColorPickerPalette();
    });

    const applyStyle = (property: TSelectionStyleProperty, value: string | number) => {
      txApplySelectionStyleChange({
        crdt: args.crdt,
        editor: args.editor,
        history: args.history,
        render: args.render,
        selection: args.selection,
        fxFindAttachedTextNodeByContainerId: (containerId) => {
          const node = args.render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
            return candidate instanceof args.render.Text && candidate.getAttr("vcContainerId") === containerId;
          });

          return node instanceof args.render.Text ? node : null;
        },
        txRefreshEditingShape1d: () => {
          if (args.editor.editingShape1dId === null) {
            return;
          }

          const editingNode = fxFindShape1dNodeById({ render: args.render }, { id: args.editor.editingShape1dId });
          editingNode?.getLayer()?.batchDraw();
        },
      }, { property, value });
      syncVersion();
    };

    return createComponent(SelectionStyleMenu, {
      visible,
      sections,
      values,
      strokeWidthOptions,
      colorPalette,
      onFillChange: (color) => applyStyle("fill", color),
      onStrokeChange: (color) => applyStyle("stroke", color),
      onStrokeWidthChange: (width) => applyStyle("strokeWidth", width),
      onOpacityChange: (opacity) => applyStyle("opacity", opacity),
      onFontFamilyChange: (fontFamily: TFontFamily) => applyStyle("fontFamily", fontFamily),
      onFontSizePresetChange: (preset) => applyStyle("fontSizePreset", preset),
      onTextAlignChange: (textAlign) => applyStyle("textAlign", textAlign),
      onVerticalAlignChange: (verticalAlign) => applyStyle("verticalAlign", verticalAlign),
      onLineTypeChange: (lineType: TLineType) => applyStyle("lineType", lineType),
      onStartCapChange: (capStyle: TCapStyle) => applyStyle("startCap", capStyle),
      onEndCapChange: (capStyle: TCapStyle) => applyStyle("endCap", capStyle),
    });
  }, mountElement);

  return {
    mountElement,
    dispose() {
      disposeRender();
      mountElement.remove();
    },
  };
}

export function createSelectionStyleMenuPlugin(): IPlugin<{
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: SceneService;
  selection: SelectionService;
  theme: ThemeService;
}, IHooks> {
  let menuMount: ReturnType<typeof mountSelectionStyleMenu> | null = null;

  return {
    name: "selection-style-menu",
    apply(ctx) {
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const history = ctx.services.require("history");
      const render = ctx.services.require("scene");
      const selection = ctx.services.require("selection");
      const theme = ctx.services.require("theme");

      ctx.hooks.init.tap(() => {
        menuMount = mountSelectionStyleMenu({
          crdt,
          editor,
          history,
          render,
          selection,
          theme,
        });
      });

      ctx.hooks.destroy.tap(() => {
        menuMount?.dispose();
        menuMount = null;
      });
    },
  };
}
