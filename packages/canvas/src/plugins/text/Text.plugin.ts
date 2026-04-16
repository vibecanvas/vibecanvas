import type { IPlugin } from "@vibecanvas/runtime";
import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";
import { throttle } from "@solid-primitives/scheduled";
import { resolveThemeColor, type ThemeService } from "@vibecanvas/service-theme";
import Type from "lucide-static/icons/type.svg?raw";
import type { TElement, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import Konva from "konva";
import type { CameraService } from "../../services/camera/CameraService";
import type { ContextMenuService } from "../../services/context-menu/ContextMenuService";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { EditorService } from "../../services/editor/EditorService";
import type { HistoryService } from "../../services/history/HistoryService";
import type { RenderOrderService } from "../../services/render-order/RenderOrderService";
import type { SceneService } from "../../services/scene/SceneService";
import type { TCanvasTransformAnchor, SelectionService, CanvasRegistryService } from "../../services";
import { CanvasMode } from "../../services/selection/CONSTANTS";
import type { IHooks } from "../../runtime";
import { fxCreateTextElement } from "./fn.create-text-element";
import { fxToElement } from "./fx.to-element";
import { txCreateTextCloneDrag } from "./tx.create-text-clone-drag";
import { txEnterEditMode } from "./tx.enter-edit-mode";
import { txSetupTextNode } from "./tx.setup-text-node";
import { txUpdateTextNodeFromElement } from "./tx.update-text-node-from-element";
import { txDeleteSelection } from "../select/tx.delete-selection";
import { txFinalizeOwnedTransform } from "../../core/tx.finalize-owned-transform";
import {
  DEFAULT_TEXT_ALIGN,
  DEFAULT_TEXT_FONT_FAMILY,
  DEFAULT_TEXT_FONT_SIZE_TOKEN,
  DEFAULT_TEXT_LINE_HEIGHT,
  DEFAULT_TEXT_VERTICAL_ALIGN,
} from "./CONSTANTS";

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
const DEFAULT_TEXT_COLOR_TOKEN = "@base/900";

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
    fontSize: theme.resolveFontSize(element.style.fontSize),
    fontFamily: data.fontFamily,
    align: element.style.textAlign ?? DEFAULT_TEXT_ALIGN,
    verticalAlign: element.style.verticalAlign ?? DEFAULT_TEXT_VERTICAL_ALIGN,
    lineHeight: DEFAULT_TEXT_LINE_HEIGHT,
    wrap: isAttachedText ? "word" : "none",
    draggable: !isAttachedText,
    listening: !isAttachedText,
    fill: getTextFillColor(theme, element),
    opacity: element.style.opacity ?? 1,
    scaleX: element.scaleX ?? 1,
    scaleY: element.scaleY ?? 1,
  });

  applyTextThemeState(node, element);
  node.setAttr(ELEMENT_STYLE_ATTR, structuredClone(element.style));
  node.setAttr("vcContainerId", data.containerId ?? null);
  node.setAttr("vcOriginalText", data.originalText);
  node.setAttr("vcTextAutoResize", data.autoResize);
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

function fxApplyRememberedTextToolStyle(args: {
  element: TElement;
  rememberedStyle: {
    strokeColor?: string;
    opacity?: number;
    fontFamily?: string;
    fontSize?: string;
    textAlign?: TElement["style"]["textAlign"];
    verticalAlign?: TElement["style"]["verticalAlign"];
  };
}) {
  const nextElement = structuredClone(args.element);
  const rememberedStrokeColor = args.rememberedStyle.strokeColor;
  if (typeof rememberedStrokeColor === "string") {
    nextElement.style.strokeColor = rememberedStrokeColor;
  }

  const rememberedOpacity = args.rememberedStyle.opacity;
  if (typeof rememberedOpacity === "number") {
    nextElement.style.opacity = rememberedOpacity;
  }

  if (nextElement.data.type !== "text") {
    return nextElement;
  }

  const rememberedFontFamily = args.rememberedStyle.fontFamily;
  if (typeof rememberedFontFamily === "string") {
    nextElement.data.fontFamily = rememberedFontFamily;
  }

  const rememberedFontSize = args.rememberedStyle.fontSize;
  if (typeof rememberedFontSize === "string") {
    nextElement.style.fontSize = rememberedFontSize;
  }


  const rememberedTextAlign = args.rememberedStyle.textAlign;
  if (rememberedTextAlign === "left" || rememberedTextAlign === "center" || rememberedTextAlign === "right") {
    nextElement.style.textAlign = rememberedTextAlign;
  }

  const rememberedVerticalAlign = args.rememberedStyle.verticalAlign;
  if (rememberedVerticalAlign === "top" || rememberedVerticalAlign === "middle" || rememberedVerticalAlign === "bottom") {
    nextElement.style.verticalAlign = rememberedVerticalAlign;
  }

  return nextElement;
}

function txApplyTextTransform(args: {
  node: Konva.Node;
}) {
  return args.node instanceof Konva.Text;
}

/**
 * Owns free-text create, edit, drag, clone-drag, and editor transform registries.
 * Attached-text behavior stays separate from free-text interactions.
 */
export function createTextPlugin(): IPlugin<{
  camera: CameraService;
  canvasRegistry: CanvasRegistryService;
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
      const camera = ctx.services.require("camera");
      const canvasRegistry = ctx.services.require("canvasRegistry");
      const contextMenu = ctx.services.require("contextMenu");
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const history = ctx.services.require("history");
      const scene = ctx.services.require("scene");
      const renderOrder = ctx.services.require("renderOrder");
      const selection = ctx.services.require("selection");
      const theme = ctx.services.require("theme");
      const document = scene.container.ownerDocument;
      const createId = () => crypto.randomUUID();
      const now = () => Date.now();

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
          history,
          hooks: ctx.hooks,
          render: scene,
          selection,
          serializeNode: ({ node, createdAt, updatedAt }) => fxSerializeTextNode(canvasRegistry, { node, createdAt, updatedAt }),
          theme,
          now,
          startDragClone: (args) => canvasRegistry.createDragClone(args),
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

          const timestamp = now();
          return fxSerializeTextNode(canvasRegistry, {
            node,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        },
        createNode: (element) => {
          if (element.data.type !== "text") {
            return null;
          }

          return createTextNode(theme, element);
        },
        createDragClone: ({ node }) => {
          if (!(node instanceof Konva.Text)) {
            return false;
          }

          const element = canvasRegistry.toElement(node);
          if (!element || element.data.type !== "text" || element.data.containerId !== null) {
            return false;
          }

          txCreateTextCloneDrag({
            Konva,
            crdt,
            render: scene,
            selection,
            createId,
            now,
            serializeNode: ({ node: candidateNode, createdAt, updatedAt }) => fxSerializeTextNode(canvasRegistry, {
              node: candidateNode,
              createdAt,
              updatedAt,
            }),
            setupNode,
          }, {
            freeTextName: FREE_TEXT_NAME,
            node,
          });
          return true;
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
            strokeColor: DEFAULT_TEXT_COLOR_TOKEN,
            opacity: 1,
            fontFamily: `${DEFAULT_TEXT_FONT_FAMILY}, sans-serif`,
            fontSize: DEFAULT_TEXT_FONT_SIZE_TOKEN,
            textAlign: DEFAULT_TEXT_ALIGN,
            verticalAlign: DEFAULT_TEXT_VERTICAL_ALIGN,
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

                const timestamp = now();
                return fxSerializeTextNode(canvasRegistry, {
                  node: candidateNode,
                  createdAt: beforeElement?.createdAt ?? timestamp,
                  updatedAt: timestamp,
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

                const timestamp = now();
                return fxSerializeTextNode(canvasRegistry, {
                  node: candidateNode,
                  createdAt: beforeElement?.createdAt ?? timestamp,
                  updatedAt: timestamp,
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
            txDeleteSelection({ Group: Konva.Group, Shape: Konva.Shape, Layer: Konva.Layer, canvasRegistry, crdt, history, render: scene, renderOrder, selection }, {});
          },
        }];
      });

      ctx.hooks.init.tap(() => {
        editor.registerTool({
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

        const timestamp = now();
        const element = fxApplyRememberedTextToolStyle({
          element: fxCreateTextElement({
            id: createId(),
            x: pointer.x,
            y: pointer.y,
            createdAt: timestamp,
            updatedAt: timestamp,
          }),
          rememberedStyle: {
            strokeColor: DEFAULT_TEXT_COLOR_TOKEN,
            opacity: 1,
            fontFamily: `${DEFAULT_TEXT_FONT_FAMILY}, sans-serif`,
            fontSize: DEFAULT_TEXT_FONT_SIZE_TOKEN,
            textAlign: DEFAULT_TEXT_ALIGN,
            verticalAlign: DEFAULT_TEXT_VERTICAL_ALIGN,
            ...theme.getRememberedStyle("text"),
          },
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
          camera,
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
          camera,
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
