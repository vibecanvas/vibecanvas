import type { IPlugin } from "@vibecanvas/runtime";
import type Konva from "konva";
import { createComponent, createMemo, createSignal } from "solid-js";
import { render as renderSolid } from "solid-js/web";
import { SelectionStyleMenu } from "../../components/SelectionStyleMenu";
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
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { findShape1dNodeById } from "../shape1d/Shape1d.shared";
import type { IHooks } from "../../runtime";

const STYLE_MENU_DEBUG_PREFIX = "[selection-style-menu:debug]";

function logStyleMenuDebug(message: string, payload?: Record<string, unknown>) {
  if (payload) {
    console.debug(STYLE_MENU_DEBUG_PREFIX, message, payload);
    return;
  }

  console.debug(STYLE_MENU_DEBUG_PREFIX, message);
}

function mountSelectionStyleMenu(args: {
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: RenderService;
  selection: SelectionService;
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
  const syncVersion = (reason: string, payload?: Record<string, unknown>) => {
    logStyleMenuDebug(`sync-version:${reason}`, payload);
    setVersion((value) => value + 1);
  };

  args.selection.hooks.change.tap(() => {
    syncVersion("selection-change", {
      selectionIds: args.selection.selection.map((node) => node.id()),
      focusedId: args.selection.focusedId,
    });
  });
  args.editor.hooks.editingTextChange.tap((id) => {
    syncVersion("editing-text-change", { editingTextId: id });
  });
  args.editor.hooks.editingShape1dChange.tap((id) => {
    syncVersion("editing-shape1d-change", { editingShape1dId: id });
  });
  args.editor.hooks.toElementRegistryChange.tap(() => {
    syncVersion("to-element-registry-change");
  });
  args.crdt.hooks.change.tap(() => {
    syncVersion("crdt-change", {
      docElementCount: Object.keys(args.crdt.doc().elements).length,
    });
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
        logStyleMenuDebug("visible=false:editing-active", {
          focusedId: focusedId(),
          editingTextId: args.editor.editingTextId,
          textareaMounted,
        });
        return false;
      }

      if (focusedId() === null) {
        logStyleMenuDebug("visible=false:no-focused-id");
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

      logStyleMenuDebug("visible-eval", {
        focusedId: focusedId(),
        editingTextId: args.editor.editingTextId,
        textareaMounted,
        selectionIds: args.selection.selection.map((node) => node.id()),
        elementIds: elements().map((element) => element.id),
        textElementIds: textElements().map((element) => element.id),
        sections: next,
        visible: nextVisible,
      });

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

    const applyStyle = (property: TSelectionStyleProperty, value: string | number) => {
      logStyleMenuDebug("apply-style", {
        property,
        value,
        focusedId: args.selection.focusedId,
        selectionIds: args.selection.selection.map((node) => node.id()),
      });

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

          const editingNode = findShape1dNodeById(args.render, args.editor.editingShape1dId);
          editingNode?.getLayer()?.batchDraw();
        },
      }, { property, value });
      syncVersion("apply-style");
    };

    return createComponent(SelectionStyleMenu, {
      visible,
      sections,
      values,
      strokeWidthOptions,
      colorStorageKey: "canvas-selection-style-menu",
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
      logStyleMenuDebug("dispose");
      disposeRender();
      mountElement.remove();
    },
  };
}

export function createSelectionStyleMenuPlugin(): IPlugin<{
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: RenderService;
  selection: SelectionService;
}, IHooks> {
  let menuMount: ReturnType<typeof mountSelectionStyleMenu> | null = null;

  return {
    name: "selection-style-menu",
    apply(ctx) {
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const history = ctx.services.require("history");
      const render = ctx.services.require("render");
      const selection = ctx.services.require("selection");

      ctx.hooks.init.tap(() => {
        logStyleMenuDebug("init");
        menuMount = mountSelectionStyleMenu({
          crdt,
          editor,
          history,
          render,
          selection,
        });
      });

      ctx.hooks.destroy.tap(() => {
        menuMount?.dispose();
        menuMount = null;
      });
    },
  };
}
