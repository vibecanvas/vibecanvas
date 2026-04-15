import type { IPlugin } from "@vibecanvas/runtime";
import Konva from "konva";
import { createComponent, createMemo, createSignal } from "solid-js";
import { render as renderSolid } from "solid-js/web";
import { SelectionStyleMenu } from "../../components/SelectionStyleMenu";
import type { ThemeService } from "@vibecanvas/service-theme";
import { txApplySelectionStyleChange, txApplySelectionStyleChangeRuntime, txCommitSelectionStyleChange, txCreateSelectionStyleChangePlan } from "../../core/tx.apply-selection-style-change";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { EditorServiceV2 } from "../../services/editor/EditorServiceV2";
import type { HistoryService } from "../../services/history/HistoryService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import type { IHooks } from "../../runtime";
import { fxMountSelectionStyleMenu } from "./fx.mount-selection-style-menu";

export function createSelectionStyleMenuPlugin(): IPlugin<{
  canvasRegistry: CanvasRegistryService;
  crdt: CrdtService;
  editor2: EditorServiceV2;
  history: HistoryService;
  scene: SceneService;
  selection: SelectionService;
  theme: ThemeService;
}, IHooks> {
  let menuMount: ReturnType<typeof fxMountSelectionStyleMenu> | null = null;

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
        menuMount = fxMountSelectionStyleMenu({
          Konva,
          SelectionStyleMenu,
          createComponent,
          createMemo,
          createSignal,
          renderSolid,
          txApplySelectionStyleChange,
          txApplySelectionStyleChangeRuntime,
          txCommitSelectionStyleChange,
          txCreateSelectionStyleChangePlan,
          setTimeout: (handler, timeout, ...rest) => {
            const view = scene.container.ownerDocument.defaultView;
            if (view) {
              return view.setTimeout(handler, timeout, ...rest);
            }

            return globalThis.setTimeout(handler, timeout, ...rest);
          },
          clearTimeout: (timer) => {
            const view = scene.container.ownerDocument.defaultView;
            if (view) {
              view.clearTimeout(timer);
              return;
            }

            globalThis.clearTimeout(timer);
          },
          canvasRegistry,
          crdt,
          editor,
          history,
          scene,
          selection,
          theme,
        }, {});
      });

      ctx.hooks.destroy.tap(() => {
        menuMount?.dispose();
        menuMount = null;
      });
    },
  };
}
