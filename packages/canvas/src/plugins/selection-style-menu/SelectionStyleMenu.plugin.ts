import type { IPlugin } from "@vibecanvas/runtime";
import Konva from "konva";
import { createComponent, createMemo, createSignal } from "solid-js";
import { render as renderSolid } from "solid-js/web";
import { SelectionStyleMenu } from "../../components/SelectionStyleMenu";
import type { ThemeService } from "@vibecanvas/service-theme";
import type { TCapStyle, TFontFamily, TLineType } from "../../components/SelectionStyleMenu/types";
import { fxResolveFocusedSelectionStyleElements } from "../../core/fx.resolve-selection-style-elements";
import { fxResolveSelectionStyleTextElements } from "../../core/fx.resolve-selection-style-text-elements";
import {
  fnGetSelectionStyleMenuSections,
  fnGetSelectionStyleMenuValues,
  fnGetSelectionStyleStrokeWidthOptions,
  type TSelectionStyleProperty,
} from "../../core/fn.selection-style-menu";
import { txApplySelectionStyleChange } from "../../core/tx.apply-selection-style-change";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { EditorServiceV2 } from "../../services/editor/EditorServiceV2";
import type { HistoryService } from "../../services/history/HistoryService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import { fxFindShape1dNodeById } from "../shape1d/fx.node";
import type { IHooks } from "../../runtime";

function mountSelectionStyleMenu(args: {
  canvasRegistry: CanvasRegistryService;
  crdt: CrdtService;
  editor: EditorServiceV2;
  history: HistoryService;
  scene: SceneService;
  selection: SelectionService;
  theme: ThemeService;
}) {
  const mountElement = args.scene.container.ownerDocument.createElement("div");
  Object.assign(mountElement.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "50",
  });
  args.scene.stage.container().appendChild(mountElement);

  const fxFindAttachedTextNodeByContainerId = (containerId: string) => {
    const node = args.scene.staticForegroundLayer.findOne((candidate: Konva.Node) => {
      return candidate instanceof Konva.Text && candidate.getAttr("vcContainerId") === containerId;
    });

    return node instanceof Konva.Text ? node : null;
  };

  const [version, setVersion] = createSignal(0);
  const syncVersion = () => {
    setVersion((value) => value + 1);
  };

  args.selection.hooks.change.tap(syncVersion);
  args.editor.hooks.editingTextChange.tap(syncVersion);
  args.editor.hooks.editingShape1dChange.tap(syncVersion);
  args.canvasRegistry.hooks.elementsChange.tap(syncVersion);
  args.crdt.hooks.change.tap(syncVersion);
  args.theme.hooks.change.tap(syncVersion);

  const disposeRender = renderSolid(() => {
    const focusedId = createMemo(() => {
      version();
      return args.selection.focusedId;
    });
    const elements = createMemo(() => {
      return fxResolveFocusedSelectionStyleElements({
        Konva,
        editor: args.editor,
        scene: args.scene,
      }, {
        focusedId: focusedId(),
      });
    });
    const textElements = createMemo(() => {
      version();
      return fxResolveSelectionStyleTextElements({
        editor: args.editor,
        fxFindAttachedTextNodeByContainerId,
      }, {
        elements: elements(),
      });
    });
    const sections = createMemo(() => {
      return fnGetSelectionStyleMenuSections({
        elements: elements(),
        textElements: textElements(),
      });
    });
    const visible = createMemo(() => {
      const textareaMounted = args.scene.stage.container().querySelector("textarea") !== null;
      const isEditingTextActive = args.editor.editingTextId !== null && textareaMounted;
      if (isEditingTextActive) {
        return false;
      }

      if (focusedId() === null) {
        return false;
      }

      const next = sections();
      return next.showFillPicker
        || next.showStrokeColorPicker
        || next.showStrokeWidthPicker
        || next.showTextPickers
        || next.showOpacityPicker
        || next.showLineTypePicker
        || next.showStartCapPicker
        || next.showEndCapPicker;
    });
    const values = createMemo(() => {
      return fnGetSelectionStyleMenuValues({
        elements: elements(),
        textElements: textElements(),
      });
    });
    const strokeWidthOptions = createMemo(() => {
      return fnGetSelectionStyleStrokeWidthOptions(elements());
    });
    const colorPalette = createMemo(() => {
      version();
      return args.theme.getThemeColorPickerPalette();
    });

    const applyStyle = (property: TSelectionStyleProperty, value: string | number) => {
      txApplySelectionStyleChange({
        Konva,
        crdt: args.crdt,
        editor: args.editor,
        canvasRegistry: args.canvasRegistry,
        history: args.history,
        scene: args.scene,
        selection: args.selection,
        fxFindAttachedTextNodeByContainerId,
        txRefreshEditingShape1d: () => {
          if (args.editor.editingShape1dId === null) {
            return;
          }

          const editingNode = fxFindShape1dNodeById({ Shape: Konva.Shape, render: args.scene }, { id: args.editor.editingShape1dId });
          editingNode?.getLayer()?.batchDraw();
        },
        now: () => Date.now(),
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
  canvasRegistry: CanvasRegistryService;
  crdt: CrdtService;
  editor2: EditorServiceV2;
  history: HistoryService;
  scene: SceneService;
  selection: SelectionService;
  theme: ThemeService;
}, IHooks> {
  let menuMount: ReturnType<typeof mountSelectionStyleMenu> | null = null;

  return {
    name: "selection-style-menu",
    apply(ctx) {
      const canvasRegistry = ctx.services.require("canvasRegistry");
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor2");
      const history = ctx.services.require("history");
      const scene = ctx.services.require("scene");
      const selection = ctx.services.require("selection");
      const theme = ctx.services.require("theme");

      ctx.hooks.init.tap(() => {
        menuMount = mountSelectionStyleMenu({
          canvasRegistry,
          crdt,
          editor,
          history,
          scene,
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
