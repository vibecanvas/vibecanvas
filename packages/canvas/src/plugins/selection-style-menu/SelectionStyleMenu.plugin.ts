import type { IPlugin } from "@vibecanvas/runtime";
import Konva from "konva";
import { createComponent, createMemo, createSignal } from "solid-js";
import { render as renderSolid } from "solid-js/web";
import { SelectionStyleMenu } from "../../components/SelectionStyleMenu";
import type { ThemeService } from "@vibecanvas/service-theme";
import { txApplySelectionStyleChange, txApplySelectionStyleChangeRuntime, txCommitSelectionStyleChange, txCreateSelectionStyleChangePlan } from "../../core/tx.apply-selection-style-change";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { EditorService } from "../../services/editor/EditorService";
import type { HistoryService } from "../../services/history/HistoryService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import type { IRuntimeHooks } from "../../runtime";
import { fxMountSelectionStyleMenu } from "./fx.mount-selection-style-menu";

type TSelectionStyleMenuTimer = number | ReturnType<typeof globalThis.setTimeout>;

export function createSelectionStyleMenuPlugin(): IPlugin<{
  canvasRegistry: CanvasRegistryService;
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  scene: SceneService;
  selection: SelectionService;
  theme: ThemeService;
}, IRuntimeHooks> {
  let menuMount: ReturnType<typeof fxMountSelectionStyleMenu> | null = null;

  return {
    name: "selection-style-menu",
    apply(ctx) {
      const canvasRegistry = ctx.services.require("canvasRegistry");
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const history = ctx.services.require("history");
      const scene = ctx.services.require("scene");
      const selection = ctx.services.require("selection");
      const theme = ctx.services.require("theme");

      ctx.hooks.init.tap(() => {
        const setSelectionStyleMenuTimeout = (handler: () => void, timeout?: number): TSelectionStyleMenuTimer => {
          const view = scene.container.ownerDocument.defaultView;
          if (view) {
            return view.setTimeout(handler, timeout);
          }

          return globalThis.setTimeout(handler, timeout);
        };

        const clearSelectionStyleMenuTimeout = (timer: TSelectionStyleMenuTimer | null) => {
          if (timer === null) {
            return;
          }

          const view = scene.container.ownerDocument.defaultView;
          if (view && typeof timer === "number") {
            view.clearTimeout(timer);
            return;
          }

          globalThis.clearTimeout(timer);
        };

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
          setTimeout: setSelectionStyleMenuTimeout,
          clearTimeout: clearSelectionStyleMenuTimeout,
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
