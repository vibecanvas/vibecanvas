import type { IPlugin } from "@vibecanvas/runtime";
import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";
import { resolveThemeColor, type ThemeService } from "@vibecanvas/service-theme";
import Type from "lucide-static/icons/type.svg?raw";
import type { TElement, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import Konva from "konva";
import type { ContextMenuService } from "../../new-services/context-menu/ContextMenuService";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { SceneService } from "../../new-services/scene/SceneService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { CanvasMode } from "../../new-services/selection/CONSTANTS";
import { fnGetNearestFontSizePreset } from "../../core/fn.text-style";
import type { IHooks } from "../../runtime";
import { fxCreateTextElement } from "./fn.create-text-element";
import { fxToElement } from "./fx.to-element";
import { txEnterEditMode } from "./tx.enter-edit-mode";
import { txSetupTextNode } from "./tx.setup-text-node";
import { txUpdateTextNodeFromElement } from "./tx.update-text-node-from-element";
import { txDeleteSelection } from "../select/tx.delete-selection";

const FREE_TEXT_NAME = "free-text";
const ATTACHED_TEXT_NAME = "attached-text";
const TEXT_USES_THEME_COLOR_ATTR = "vcUsesThemeTextColor";
const ELEMENT_STYLE_ATTR = "vcElementStyle";

function usesThemeTextColor(element: Pick<TElement, "style">) {
  return !element.style.strokeColor;
}

function getTextFillColor(theme: ThemeService, element: Pick<TElement, "style">) {
  return resolveThemeColor(theme.getTheme(), element.style.strokeColor, theme.getTheme().colors.canvasText) ?? theme.getTheme().colors.canvasText;
}

function applyTextThemeState(node: Konva.Text, element: Pick<TElement, "style">) {
  node.setAttr(TEXT_USES_THEME_COLOR_ATTR, usesThemeTextColor(element));
}

function createTextNode(scene: SceneService, theme: ThemeService, element: TElement) {
  void scene;
  const data = element.data as TTextData;

  const isAttachedText = data.containerId !== null;
  const node = new Konva.Text({
    id: element.id,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    width: data.w,
    height: data.h,
    text: data.text,
    fontSize: data.fontSize,
    fontFamily: data.fontFamily,
    align: data.textAlign,
    verticalAlign: data.verticalAlign,
    lineHeight: data.lineHeight,
    wrap: isAttachedText ? "word" : "none",
    draggable: !isAttachedText,
    listening: !isAttachedText,
    fill: getTextFillColor(theme, element),
    opacity: element.style.opacity ?? 1,
  });

  applyTextThemeState(node, element);
  node.setAttr(ELEMENT_STYLE_ATTR, structuredClone(element.style));
  node.setAttr("vcContainerId", data.containerId ?? null);
  node.setAttr("vcOriginalText", data.originalText);
  node.setAttr("vcTextAutoResize", data.autoResize);
  node.setAttr("vcFontSizePreset", data.fontSizePreset ?? fnGetNearestFontSizePreset(data.fontSize));
  node.name(isAttachedText ? ATTACHED_TEXT_NAME : FREE_TEXT_NAME);
  return node;
}

/**
 * Owns free-text create, edit, drag, and editor transform registries.
 * Attached-text and clone-drag parity can come later.
 */
export function createTextPlugin(): IPlugin<{
  contextMenu: ContextMenuService;
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  scene: SceneService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  theme: ThemeService;
}, IHooks> {
  return {
    name: "text",
    apply(ctx) {
      const contextMenu = ctx.services.require("contextMenu");
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const history = ctx.services.require("history");
      const scene = ctx.services.require("scene");
      const renderOrder = ctx.services.require("renderOrder");
      const selection = ctx.services.require("selection");
      const theme = ctx.services.require("theme");
      const document = scene.container.ownerDocument;

      const syncThemeTextNodes = () => {
        scene.staticForegroundLayer.find((candidate: Konva.Node) => {
          return candidate instanceof Konva.Text;
        }).forEach((candidate) => {
          if (!(candidate instanceof Konva.Text)) {
            return;
          }

          const element = editor.toElement(candidate);
          if (!element || element.data.type !== "text") {
            return;
          }

          txUpdateTextNodeFromElement({
            Konva,
            scene,
            theme,
          }, {
            element,
            freeTextName: FREE_TEXT_NAME,
          });
        });
        scene.staticForegroundLayer.batchDraw();
      };

      const setupNode = (node: Konva.Text) => {
        txSetupTextNode(
          {
            Konva,
            crdt,
            crypto,
            history,
            editor,
            hooks: ctx.hooks,
            render: scene,
            selection,
            setupNode,
            theme,
          },
          { freeTextName: FREE_TEXT_NAME, node },
        );
        return node;
      };

      contextMenu.registerProvider("text", ({ targetElement, activeSelection }) => {
        if (targetElement?.data.type !== "text") {
          return [];
        }

        return [{
          id: "delete-text-selection",
          label: "Delete",
          priority: 300,
          onSelect: () => {
            selection.setSelection(activeSelection);
            txDeleteSelection({ crdt, editor, history, render: scene, renderOrder, selection }, {});
          },
        }];
      });

      editor.registerTool({
        id: "text",
        label: "Text",
        icon: Type,
        shortcuts: ["t"],
        priority: 50,
        behavior: { type: "mode", mode: "click-create" },
      });

      editor.registerToElement("text", (node) => {
        if (!(node instanceof Konva.Text)) {
          return null;
        }

        const now = Date.now();
        return fxToElement({ editor }, { node, createdAt: now, updatedAt: now });
      });

      editor.registerCreateShapeFromTElement("text", (element) => {
        if (element.data.type !== "text") {
          return null;
        }

        return setupNode(createTextNode(scene, theme, element));
      });

      editor.registerSetupExistingShape("text", (node) => {
        if (!(node instanceof Konva.Text)) {
          return false;
        }

        setupNode(node);
        return true;
      });

      editor.registerUpdateShapeFromTElement("text", (element) => {
        return txUpdateTextNodeFromElement({
          Konva,
          scene,
          theme,
        }, {
          element,
          freeTextName: FREE_TEXT_NAME,
        });
      });

      theme.hooks.change.tap(() => {
        syncThemeTextNodes();
      });

      ctx.hooks.pointerUp.tap(() => {
        if (selection.mode !== CanvasMode.CLICK_CREATE) {
          return;
        }

        if (editor.activeToolId !== "text") {
          return;
        }

        const pointer = scene.staticForegroundLayer.getRelativePointerPosition();
        if (!pointer) {
          return;
        }

        const now = Date.now();
        const element = fxCreateTextElement({
          id: crypto.randomUUID(),
          x: pointer.x,
          y: pointer.y,
          createdAt: now,
          updatedAt: now,
        });
        const node = setupNode(createTextNode(scene, theme, element));

        scene.staticForegroundLayer.add(node);
        renderOrder.assignOrderOnInsert({
          parent: scene.staticForegroundLayer,
          nodes: [node],
          position: "front",
        });
        scene.staticForegroundLayer.batchDraw();
        selection.setSelection([node]);
        selection.setFocusedNode(node);
        editor.setActiveTool("select");

        txEnterEditMode(
          { Konva, crdt, document, editor, history, scene, selection, theme, pretext: { layoutWithLines, prepareWithSegments } },
          { freeTextName: FREE_TEXT_NAME, node, isNew: true },
        );
      });

      ctx.hooks.elementPointerDoubleClick.tap((event) => {
        if (!(event.currentTarget instanceof Konva.Text)) {
          return false;
        }

        if (event.currentTarget.name() !== FREE_TEXT_NAME) {
          return false;
        }

        txEnterEditMode(
          { Konva, crdt, document, editor, history, scene, selection, theme, pretext: { layoutWithLines, prepareWithSegments } },
          { freeTextName: FREE_TEXT_NAME, node: event.currentTarget, isNew: false },
        );
        return true;
      });

      ctx.hooks.destroy.tap(() => {
        contextMenu.unregisterProvider("text");
        editor.unregisterTool("text");
        editor.unregisterToElement("text");
        editor.unregisterCreateShapeFromTElement("text");
        editor.unregisterSetupExistingShape("text");
        editor.unregisterUpdateShapeFromTElement("text");
      });
    },
  };
}
