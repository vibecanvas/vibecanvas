import type { IPlugin } from "@vibecanvas/runtime";
import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";
import { resolveThemeColor, type ThemeService } from "@vibecanvas/service-theme";
import Type from "lucide-static/icons/type.svg?raw";
import type { TElement, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
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

function createTextNode(render: SceneService, theme: ThemeService, element: TElement) {
  const data = element.data as TTextData;

  const isAttachedText = data.containerId !== null;
  const node = new render.Text({
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
  render: SceneService;
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
      const render = ctx.services.require("scene");
      const renderOrder = ctx.services.require("renderOrder");
      const selection = ctx.services.require("selection");
      const theme = ctx.services.require("theme");
      const document = render.container.ownerDocument;
      const syncThemeTextNodes = () => {
        render.staticForegroundLayer.find((candidate: Konva.Node) => {
          return candidate instanceof render.Text;
        }).forEach((candidate) => {
          if (!(candidate instanceof render.Text)) {
            return;
          }

          const element = editor.toElement(candidate);
          if (!element || element.data.type !== "text") {
            return;
          }

          txUpdateTextNodeFromElement({
            render,
            theme,
          }, {
            element,
            freeTextName: FREE_TEXT_NAME,
          });
        });
        render.staticForegroundLayer.batchDraw();
      };

      const setupNode = (node: Konva.Text) => {
        txSetupTextNode(
          {
            crdt,
            crypto,
            history,
            editor,
            hooks: ctx.hooks,
            render,
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
            txDeleteSelection({ crdt, editor, history, render, renderOrder, selection }, {});
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
        if (!(node instanceof render.Text)) {
          return null;
        }

        const now = Date.now();
        return fxToElement({ editor, render }, { node, createdAt: now, updatedAt: now });
      });

      editor.registerCreateShapeFromTElement("text", (element) => {
        if (element.data.type !== "text") {
          return null;
        }

        return setupNode(createTextNode(render, theme, element));
      });

      editor.registerSetupExistingShape("text", (node) => {
        if (!(node instanceof render.Text)) {
          return false;
        }

        setupNode(node);
        return true;
      });

      editor.registerUpdateShapeFromTElement("text", (element) => {
        return txUpdateTextNodeFromElement({
          render,
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

        const pointer = render.staticForegroundLayer.getRelativePointerPosition();
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
        const node = setupNode(createTextNode(render, theme, element));

        render.staticForegroundLayer.add(node);
        renderOrder.assignOrderOnInsert({
          parent: render.staticForegroundLayer,
          nodes: [node],
          position: "front",
        });
        render.staticForegroundLayer.batchDraw();
        selection.setSelection([node]);
        selection.setFocusedNode(node);
        editor.setActiveTool("select");

        txEnterEditMode(
          { crdt, document, editor, history, render, selection, theme, pretext: { layoutWithLines, prepareWithSegments } },
          { freeTextName: FREE_TEXT_NAME, node, isNew: true },
        );
      });

      ctx.hooks.elementPointerDoubleClick.tap((event) => {
        if (!(event.currentTarget instanceof render.Text)) {
          return false;
        }

        if (event.currentTarget.name() !== FREE_TEXT_NAME) {
          return false;
        }

        txEnterEditMode(
          { crdt, document, editor, history, render, selection, theme, pretext: { layoutWithLines, prepareWithSegments } },
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
