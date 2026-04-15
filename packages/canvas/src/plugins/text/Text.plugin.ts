import type { IPlugin } from "@vibecanvas/runtime";
import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";
import { throttle } from "@solid-primitives/scheduled";
import { resolveThemeColor, type ThemeService } from "@vibecanvas/service-theme";
import Type from "lucide-static/icons/type.svg?raw";
import type { TElement, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import Konva from "konva";
import type { ContextMenuService } from "../../services/context-menu/ContextMenuService";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { EditorServiceV2 } from "../../services/editor/EditorServiceV2";
import type { HistoryService } from "../../services/history/HistoryService";
import type { RenderOrderService } from "../../services/render-order/RenderOrderService";
import type { SceneService } from "../../services/scene/SceneService";
import type { TCanvasTransformAnchor, SelectionService, CanvasRegistryService } from "../../services";
import { CanvasMode } from "../../services/selection/CONSTANTS";
import { fnGetNearestFontSizePreset } from "../../core/fn.text-style";
import type { IHooks } from "../../runtime";
import { fxCreateTextElement } from "./fn.create-text-element";
import { fxToElement } from "./fx.to-element";
import { txEnterEditMode } from "./tx.enter-edit-mode";
import { txSetupTextNode } from "./tx.setup-text-node";
import { txUpdateTextNodeFromElement } from "./tx.update-text-node-from-element";
import { txDeleteSelection } from "../select/tx.delete-selection";
import { txFinalizeOwnedTransform } from "../transform/tx.finalize-owned-transform";

const FREE_TEXT_NAME = "free-text";
const ATTACHED_TEXT_NAME = "attached-text";
const TEXT_USES_THEME_COLOR_ATTR = "vcUsesThemeTextColor";
const ELEMENT_STYLE_ATTR = "vcElementStyle";
const TRANSFORM_BEFORE_ELEMENT_ATTR = "vcTransformBeforeElement";
const TEXT_TRANSFORM_ANCHORS: TCanvasTransformAnchor[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

function usesThemeTextColor(element: Pick<TElement, "style">) {
  return !element.style.strokeColor;
}

function getTextFillColor(theme: ThemeService, element: Pick<TElement, "style">) {
  return resolveThemeColor(theme.getTheme(), element.style.strokeColor, theme.getTheme().colors.canvasText) ?? theme.getTheme().colors.canvasText;
}

function applyTextThemeState(node: Konva.Text, element: Pick<TElement, "style">) {
  node.setAttr(TEXT_USES_THEME_COLOR_ATTR, usesThemeTextColor(element));
}

function createTextNode(theme: ThemeService, element: TElement) {
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

function fxSerializeTextNode(canvasRegistry: CanvasRegistryService, args: {
  node: Konva.Text;
  createdAt: number;
  updatedAt: number;
}) {
  return fxToElement({
    editor: { toGroup: (node) => canvasRegistry.toGroup(node) },
  }, {
    node: args.node,
    createdAt: args.createdAt,
    updatedAt: args.updatedAt,
  });
}

function txApplyTextTransform(args: {
  node: Konva.Node;
}) {
  if (!(args.node instanceof Konva.Text)) {
    return false;
  }

  const scaleX = args.node.scaleX();
  const scaleY = args.node.scaleY();
  args.node.setAttrs({
    width: args.node.width() * scaleX,
    height: args.node.height() * scaleY,
    fontSize: Math.max(1, args.node.fontSize() * scaleX),
    scaleX: 1,
    scaleY: 1,
  });
  return true;
}

/**
 * Owns free-text create, edit, drag, and editor transform registries.
 * Attached-text and clone-drag parity can come later.
 */
export function createTextPlugin(): IPlugin<{
  canvasRegistry: CanvasRegistryService;
  contextMenu: ContextMenuService;
  crdt: CrdtService;
  editor2: EditorServiceV2;
  history: HistoryService;
  scene: SceneService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  theme: ThemeService;
}, IHooks> {
  return {
    name: "text",
    apply(ctx) {
      const canvasRegistry = ctx.services.require("canvasRegistry");
      const contextMenu = ctx.services.require("contextMenu");
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor2");
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

          const element = canvasRegistry.toElement(candidate);
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
        txSetupTextNode({
          Konva,
          crdt,
          crypto,
          history,
          hooks: ctx.hooks,
          render: scene,
          selection,
          serializeNode: ({ node, createdAt, updatedAt }) => fxSerializeTextNode(canvasRegistry, { node, createdAt, updatedAt }),
          setupNode,
          theme,
          createThrottledPatch: (callback) => throttle(callback, 100),
        }, {
          freeTextName: FREE_TEXT_NAME,
          node,
        });
        return node;
      };

      const applyElement = (element: TElement) => {
        canvasRegistry.updateElement(element);
        scene.staticForegroundLayer.batchDraw();
      };

      const unregisterTextElement = canvasRegistry.registerElement({
        id: "text",
        matchesElement: (element) => element.data.type === "text",
        matchesNode: (node) => node instanceof Konva.Text,
        toElement: (node) => {
          if (!(node instanceof Konva.Text)) {
            return null;
          }

          const now = Date.now();
          return fxSerializeTextNode(canvasRegistry, {
            node,
            createdAt: now,
            updatedAt: now,
          });
        },
        createNode: (element) => {
          if (element.data.type !== "text") {
            return null;
          }

          return createTextNode(theme, element);
        },
        attachListeners: (node) => {
          if (!(node instanceof Konva.Text)) {
            return false;
          }

          setupNode(node);
          return true;
        },
        updateElement: (element) => {
          return txUpdateTextNodeFromElement({
            Konva,
            scene,
            theme,
          }, {
            element,
            freeTextName: FREE_TEXT_NAME,
          });
        },
        getSelectionStyleMenu: ({ theme: activeTheme }) => ({
          sections: {
            showStrokeColorPicker: true,
            showTextPickers: true,
            showOpacityPicker: true,
          },
          values: {
            strokeColor: activeTheme?.getTheme().colors.canvasText ?? theme.getTheme().colors.canvasText,
            opacity: 1,
            fontFamily: "Arial, sans-serif",
            fontSizePreset: fnGetNearestFontSizePreset(16),
            textAlign: "left",
            verticalAlign: "top",
          },
        }),
        getTransformOptions: ({ element }) => {
          if (element.data.type !== "text" || element.data.containerId !== null) {
            return;
          }

          return {
            enabledAnchors: [...TEXT_TRANSFORM_ANCHORS],
            keepRatio: true,
          };
        },
        onResize: ({ node, element }) => {
          if (element.data.type !== "text" || element.data.containerId !== null) {
            return;
          }

          txApplyTextTransform({ node });
          return {
            cancel: false,
            crdt: false,
          };
        },
        afterResize: ({ node, element }) => {
          if (!(node instanceof Konva.Text) || element.data.type !== "text" || element.data.containerId !== null) {
            return;
          }

          txApplyTextTransform({ node });
          return {
            cancel: txFinalizeOwnedTransform({
              crdt,
              history,
              applyElement,
              serializeAfterElement: (candidateNode, beforeElement) => {
                if (!(candidateNode instanceof Konva.Text)) {
                  return null;
                }

                const now = Date.now();
                return fxSerializeTextNode(canvasRegistry, {
                  node: candidateNode,
                  createdAt: beforeElement?.createdAt ?? now,
                  updatedAt: now,
                });
              },
            }, {
              node,
              label: "transform-text",
              beforeAttr: TRANSFORM_BEFORE_ELEMENT_ATTR,
            }),
            crdt: false,
          };
        },
        afterRotate: ({ node, element }) => {
          if (!(node instanceof Konva.Text) || element.data.type !== "text" || element.data.containerId !== null) {
            return;
          }

          return {
            cancel: txFinalizeOwnedTransform({
              crdt,
              history,
              applyElement,
              serializeAfterElement: (candidateNode, beforeElement) => {
                if (!(candidateNode instanceof Konva.Text)) {
                  return null;
                }

                const now = Date.now();
                return fxSerializeTextNode(canvasRegistry, {
                  node: candidateNode,
                  createdAt: beforeElement?.createdAt ?? now,
                  updatedAt: now,
                });
              },
            }, {
              node,
              label: "rotate-text",
              beforeAttr: TRANSFORM_BEFORE_ELEMENT_ATTR,
            }),
            crdt: false,
          };
        },
      });

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

      ctx.hooks.init.tap(() => {
        editor.registerTool(ctx, {
          id: "text",
          label: "Text",
          icon: Type,
          shortcuts: ["t"],
          priority: 50,
          behavior: { type: "mode", mode: "click-create" },
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
        const node = canvasRegistry.createNodeFromElement(element);
        if (!(node instanceof Konva.Text)) {
          return;
        }

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

        txEnterEditMode({
          Konva,
          canvasRegistry,
          crdt,
          document,
          editor,
          history,
          scene,
          selection,
          theme,
          pretext: { layoutWithLines, prepareWithSegments },
        }, {
          freeTextName: FREE_TEXT_NAME,
          node,
          isNew: true,
        });
      });

      ctx.hooks.elementPointerDoubleClick.tap((event) => {
        if (!(event.currentTarget instanceof Konva.Text)) {
          return false;
        }

        if (event.currentTarget.name() !== FREE_TEXT_NAME) {
          return false;
        }

        txEnterEditMode({
          Konva,
          canvasRegistry,
          crdt,
          document,
          editor,
          history,
          scene,
          selection,
          theme,
          pretext: { layoutWithLines, prepareWithSegments },
        }, {
          freeTextName: FREE_TEXT_NAME,
          node: event.currentTarget,
          isNew: false,
        });
        return true;
      });

      ctx.hooks.destroy.tap(() => {
        contextMenu.unregisterProvider("text");
        unregisterTextElement();
        editor.unregisterTool("text");
      });
    },
  };
}
