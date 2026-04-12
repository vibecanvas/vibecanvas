import type { IPlugin } from "@vibecanvas/runtime";
import type { TElement, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { ContextMenuService } from "../../new-services/context-menu/ContextMenuService";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { CanvasMode } from "../../new-services/selection/enum";
import type { IHooks } from "../../runtime";
import { fxCreateTextElement } from "./fn.create-text-element";
import { fxToElement } from "./fx.to-element";
import { txEnterEditMode } from "./tx.enter-edit-mode";
import { txSetupTextNode } from "./tx.setup-text-node";
import { txUpdateTextNodeFromElement } from "./tx.update-text-node-from-element";
import { txDeleteSelection } from "../select/tx.delete-selection";

const FREE_TEXT_NAME = "free-text";

function createTextNode(render: RenderService, element: TElement) {
  const data = element.data as TTextData;

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
    wrap: "none",
    draggable: true,
    listening: true,
    fill: element.style.strokeColor ?? "#000000",
    opacity: element.style.opacity ?? 1,
  });

  node.name(FREE_TEXT_NAME);
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
  render: RenderService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
}, IHooks> {
  return {
    name: "text",
    apply(ctx) {
      const contextMenu = ctx.services.require("contextMenu");
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const history = ctx.services.require("history");
      const render = ctx.services.require("render");
      const renderOrder = ctx.services.require("renderOrder");
      const selection = ctx.services.require("selection");
      const document = render.container.ownerDocument;

      const setupNode = (node: Konva.Text) => {
        txSetupTextNode(
          {
            crdt,
            crypto,
            history,
            hooks: ctx.hooks,
            render,
            selection,
            setupNode,
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
        shortcuts: ["t"],
        priority: 50,
        behavior: { type: "mode", mode: "click-create" },
      });

      editor.registerToElement("text", (node) => {
        if (!(node instanceof render.Text)) {
          return null;
        }

        if (node.name() !== FREE_TEXT_NAME) {
          return null;
        }

        const now = Date.now();
        return fxToElement({ render }, { node, createdAt: now, updatedAt: now });
      });

      editor.registerCreateShapeFromTElement("text", (element) => {
        if (element.data.type !== "text") {
          return null;
        }

        return setupNode(createTextNode(render, element));
      });

      editor.registerSetupExistingShape("text", (node) => {
        if (!(node instanceof render.Text)) {
          return false;
        }

        if (node.name() !== FREE_TEXT_NAME) {
          return false;
        }

        setupNode(node);
        return true;
      });

      editor.registerUpdateShapeFromTElement("text", (element) => {
        return txUpdateTextNodeFromElement({ render }, { element, freeTextName: FREE_TEXT_NAME });
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
        const node = setupNode(createTextNode(render, element));

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
          { crdt, document, editor, history, render, selection },
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
          { crdt, document, editor, history, render, selection },
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
