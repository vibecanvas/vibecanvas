import { fxComputeTextHeight } from "./fn.compute-text-height";
import { fxComputeTextWidth } from "./fx.compute-text-width";
import { DEFAULT_TEXT_LINE_HEIGHT } from "./CONSTANTS";
import { fxToElement } from "./fx.to-element";
import { txUpdateTextNodeFromElement } from "./tx.update-text-node-from-element";
import { fxMeasureTextLayout } from "../../core/fx.pretext";
import { fnIsShape2dElementType } from "../../core/fn.shape2d";
import type { TElement, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { fxGetShapeTextHostBounds } from "../shape2d/fn.text-host-bounds";
import type { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";
import type { ThemeService } from "@vibecanvas/service-theme";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { EditorService } from "../../services/editor/EditorService";
import type { HistoryService } from "../../services/history/HistoryService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";
import type Konva from "konva";

export type TPortalEnterEditMode = {
  Konva: typeof Konva;
  canvasRegistry?: Pick<CanvasRegistryService, "toElement" | "toGroup" | "updateElement">;
  crdt: CrdtService;
  document: Document;
  editor: Pick<EditorService, "setEditingTextId"> & {
    toElement?: (node: Konva.Node) => TElement | null;
    toGroup?: (node: Konva.Node) => unknown;
    updateShapeFromTElement?: (element: TElement) => boolean;
  };
  history: HistoryService;
  scene: SceneService;
  selection: SelectionService;
  theme: ThemeService;
  pretext: {
    layoutWithLines: typeof layoutWithLines;
    prepareWithSegments: typeof prepareWithSegments;
  };
};

export type TArgsEnterEditMode = {
  freeTextName: string;
  isNew: boolean;
  node: Konva.Text;
};

function findAttachedHostNode(portal: TPortalEnterEditMode, containerId: string) {
  const node = portal.scene.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return candidate.id() === containerId
      && (candidate instanceof portal.Konva.Rect || candidate instanceof portal.Konva.Ellipse || candidate instanceof portal.Konva.Line);
  });

  if (!(node instanceof portal.Konva.Rect) && !(node instanceof portal.Konva.Ellipse) && !(node instanceof portal.Konva.Line)) {
    return null;
  }

  return node;
}

function fxGetShapeElementHeight(element: TElement) {
  if (element.data.type === "ellipse") {
    return element.data.ry * 2;
  }

  if (element.data.type === "rect" || element.data.type === "diamond") {
    return element.data.h;
  }

  return 0;
}

function fxGrowAttachedHostElement(args: {
  hostElement: TElement;
  minHeight: number;
}) {
  if (args.hostElement.data.type === "rect") {
    return {
      ...args.hostElement,
      data: {
        ...args.hostElement.data,
        h: Math.max(args.hostElement.data.h, args.minHeight),
      },
    } satisfies TElement;
  }

  if (args.hostElement.data.type === "diamond") {
    return {
      ...args.hostElement,
      data: {
        ...args.hostElement.data,
        h: Math.max(args.hostElement.data.h, args.minHeight),
      },
    } satisfies TElement;
  }

  if (args.hostElement.data.type === "ellipse") {
    return {
      ...args.hostElement,
      data: {
        ...args.hostElement.data,
        ry: Math.max(args.hostElement.data.ry * 2, args.minHeight) / 2,
      },
    } satisfies TElement;
  }

  return args.hostElement;
}

function findCurrentTextNode(portal: TPortalEnterEditMode, id: string) {
  const node = portal.scene.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return candidate instanceof portal.Konva.Text && candidate.id() === id;
  });

  return node instanceof portal.Konva.Text ? node : null;
}

function restoreTextSelectionLater(portal: TPortalEnterEditMode, args: { nodeId: string }) {
  portal.document.defaultView?.setTimeout(() => {
    const selectedNode = findCurrentTextNode(portal, args.nodeId);
    if (!selectedNode) {
      return;
    }

    portal.selection.setSelection([selectedNode]);
    portal.selection.setFocusedNode(selectedNode);
  }, 0);
}

function suppressNextSelectionHandling(portal: TPortalEnterEditMode, args: { reason: "commit" | "cancel" }) {
  void args;
  portal.selection.suppressSelectionHandling(120);
}

function fxSerializeTextNode(portal: TPortalEnterEditMode, args: {
  node: Konva.Text;
  createdAt: number;
  updatedAt: number;
}) {
  const toGroup = (node: Konva.Node) => {
    if (portal.canvasRegistry) {
      return portal.canvasRegistry.toGroup(node);
    }

    return portal.editor.toGroup?.(node) ?? null;
  };

  return fxToElement({ editor: { toGroup } }, args);
}

function fxGetNodeElement(portal: TPortalEnterEditMode, args: { node: Konva.Node }) {
  return portal.canvasRegistry?.toElement(args.node) ?? portal.editor.toElement?.(args.node) ?? null;
}

function applyRuntimeElement(portal: TPortalEnterEditMode, args: { element: TElement }) {
  return portal.canvasRegistry?.updateElement(args.element) ?? portal.editor.updateShapeFromTElement?.(args.element) ?? false;
}

function fxSyncTextareaColor(portal: TPortalEnterEditMode, args: {
  element: Pick<TElement, "style">;
  textarea: HTMLTextAreaElement;
}) {
  args.textarea.style.color = portal.theme.resolveThemeColor(
    args.element.style.strokeColor,
    portal.theme.getTheme().colors.canvasText,
  ) ?? portal.theme.getTheme().colors.canvasText;
}

export function txEnterEditMode(portal: TPortalEnterEditMode, args: TArgsEnterEditMode) {
  const now = Date.now();
  const originalElement = fxSerializeTextNode(portal, { node: args.node, createdAt: now, updatedAt: now });
  const originalText = args.node.text();
  const originalData = originalElement.data as TTextData;
  const isAttachedText = originalData.containerId !== null;
  const attachedHostNode = isAttachedText && originalData.containerId
    ? findAttachedHostNode(portal, originalData.containerId)
    : null;
  const originalHostElement = attachedHostNode
    ? fxGetNodeElement(portal, { node: attachedHostNode })
    : null;

  portal.editor.setEditingTextId(args.node.id());
  args.node.visible(false);
  portal.scene.stage.batchDraw();

  const textarea = portal.document.createElement("textarea");
  const initialAbsoluteScale = args.node.getAbsoluteScale();
  const initialScaledFontSize = args.node.fontSize() * initialAbsoluteScale.x;
  const initialHostHeight = originalHostElement ? fxGetShapeElementHeight(originalHostElement) : originalData.h;

  const syncAttachedEditingLayout = () => {
    if (!isAttachedText) {
      return;
    }

    const measured = fxMeasureTextLayout(portal.pretext, {
      text: textarea.value,
      fontSize: args.node.fontSize(),
      fontFamily: args.node.fontFamily(),
      fontStyle: args.node.fontStyle(),
      lineHeight: DEFAULT_TEXT_LINE_HEIGHT,
      width: args.node.width(),
    });
    const nextHostElement = originalHostElement && fnIsShape2dElementType(originalHostElement.data.type)
      ? fxGrowAttachedHostElement({
          hostElement: structuredClone(originalHostElement),
          minHeight: Math.max(initialHostHeight, measured.height),
        })
      : null;

    if (nextHostElement) {
      applyRuntimeElement(portal, { element: nextHostElement });
    }

    const hostBounds = attachedHostNode
      ? fxGetShapeTextHostBounds({
          Rect: portal.Konva.Rect,
          Ellipse: portal.Konva.Ellipse,
          Line: portal.Konva.Line,
          node: attachedHostNode,
        })
      : null;
    if (hostBounds) {
      args.node.position({ x: hostBounds.x, y: hostBounds.y });
      args.node.rotation(hostBounds.rotation);
      args.node.width(Math.max(4, hostBounds.width));
      args.node.height(Math.max(4, hostBounds.height));
    }

    const absolutePosition = args.node.getAbsolutePosition();
    const absoluteScale = args.node.getAbsoluteScale();
    const absoluteRotation = args.node.getAbsoluteRotation();
    const scaledWidth = Math.max(args.node.width() * absoluteScale.x, 4);
    const scaledHeight = Math.max(args.node.height() * absoluteScale.y, initialScaledFontSize);
    const contentHeight = measured.height * absoluteScale.y;
    const remainingHeight = Math.max(0, scaledHeight - contentHeight);
    const verticalPadding = remainingHeight / 2;

    textarea.style.top = `${absolutePosition.y}px`;
    textarea.style.left = `${absolutePosition.x}px`;
    textarea.style.width = `${scaledWidth}px`;
    textarea.style.height = `${scaledHeight}px`;
    textarea.style.minHeight = `${scaledHeight}px`;
    textarea.style.transform = `rotate(${absoluteRotation}deg)`;
    textarea.style.paddingLeft = "0px";
    textarea.style.paddingRight = "0px";
    textarea.style.paddingTop = `${verticalPadding}px`;
    textarea.style.paddingBottom = `${verticalPadding}px`;
    textarea.style.overflow = "hidden";
  };

  const autoGrow = () => {
    if (isAttachedText) {
      syncAttachedEditingLayout();
      portal.scene.staticForegroundLayer.batchDraw();
      return;
    }

    const absoluteScale = args.node.getAbsoluteScale();
    const scaledFontSize = args.node.fontSize() * absoluteScale.x;
    const scaledWidth = Math.max(args.node.width() * absoluteScale.x, 4);
    textarea.style.width = "auto";
    textarea.style.width = `${Math.max(textarea.scrollWidth, scaledWidth)}px`;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, scaledFontSize)}px`;
  };

  textarea.value = args.node.text();
  Object.assign(textarea.style, {
    position: "absolute",
    top: `${args.node.getAbsolutePosition().y}px`,
    left: `${args.node.getAbsolutePosition().x}px`,
    width: `${Math.max(args.node.width() * initialAbsoluteScale.x, 4)}px`,
    minHeight: `${initialScaledFontSize}px`,
    fontSize: `${initialScaledFontSize}px`,
    fontFamily: args.node.fontFamily(),
    lineHeight: String(DEFAULT_TEXT_LINE_HEIGHT),
    textAlign: args.node.align(),
    transform: `rotate(${args.node.getAbsoluteRotation()}deg)`,
    transformOrigin: "top left",
    whiteSpace: "pre-wrap",
    outline: "none",
    boxShadow: "none",
    background: "transparent",
    border: "none",
    resize: "none",
    overflow: "hidden",
    padding: "0",
    boxSizing: "border-box",
    zIndex: "9999",
  });
  fxSyncTextareaColor(portal, { element: originalElement, textarea });
  const offThemeChange = portal.theme.hooks.change.tap(() => {
    fxSyncTextareaColor(portal, { element: originalElement, textarea });
  });

  let didCleanup = false;
  const cleanup = () => {
    if (didCleanup) {
      return;
    }

    didCleanup = true;
    offThemeChange();
    textarea.removeEventListener("input", autoGrow);
    textarea.removeEventListener("blur", commit);
    textarea.removeEventListener("keydown", onKeyDown);
    textarea.removeEventListener("keyup", stopKeyPropagation);
    if (textarea.parentNode) {
      textarea.remove();
    }
    portal.editor.setEditingTextId(null);
  };

  const commit = () => {
    suppressNextSelectionHandling(portal, { reason: "commit" });

    const newText = textarea.value;
    const absoluteScale = args.node.getAbsoluteScale();
    const fallbackScaledWidth = Math.max(args.node.width() * absoluteScale.x, 4);
    const fallbackScaledHeight = Math.max(args.node.height() * absoluteScale.y, initialScaledFontSize);
    const screenWidth = parseFloat(textarea.style.width) || fallbackScaledWidth;
    const screenHeight = parseFloat(textarea.style.height) || fallbackScaledHeight;
    const worldWidth = screenWidth / absoluteScale.x;
    const worldHeight = screenHeight / absoluteScale.y;

    cleanup();

    if (newText === "" && isAttachedText) {
      if (originalHostElement) {
        applyRuntimeElement(portal, { element: originalHostElement });
      }
      args.node.destroy();
      portal.scene.staticForegroundLayer.batchDraw();
      const builder = portal.crdt.build();
      builder.deleteElement(args.node.id());
      builder.commit();
      if (attachedHostNode) {
        portal.selection.setSelection([attachedHostNode]);
        portal.selection.setFocusedNode(attachedHostNode);
      } else {
        portal.selection.clear();
      }
      return;
    }

    if (args.isNew && newText === "") {
      if (originalHostElement) {
        applyRuntimeElement(portal, { element: originalHostElement });
      }
      args.node.destroy();
      portal.scene.staticForegroundLayer.batchDraw();
      const builder = portal.crdt.build();
      builder.deleteElement(args.node.id());
      builder.commit();
      portal.selection.clear();
      return;
    }

    const textToSet = newText;
    args.node.text(textToSet);
    args.node.wrap(isAttachedText ? "word" : "none");
    args.node.setAttr("vcOriginalText", textToSet);

    let nextHostElement: TElement | null = null;

    if (isAttachedText) {
      if (originalHostElement && fnIsShape2dElementType(originalHostElement.data.type)) {
        nextHostElement = fxGrowAttachedHostElement({
          hostElement: structuredClone(originalHostElement),
          minHeight: worldHeight,
        });
        applyRuntimeElement(portal, { element: nextHostElement });
      } else {
        args.node.width(originalData.w);
        args.node.height(Math.max(originalData.h, worldHeight));
      }

      const nextBounds = fxGetShapeTextHostBounds({
        Rect: portal.Konva.Rect,
        Ellipse: portal.Konva.Ellipse,
        Line: portal.Konva.Line,
        node: attachedHostNode ?? args.node,
      });
      if (nextBounds) {
        args.node.width(Math.max(4, nextBounds.width));
        args.node.height(Math.max(4, nextBounds.height));
      }
    } else {
      const measured = fxMeasureTextLayout(portal.pretext, {
        text: textToSet,
        fontSize: args.node.fontSize(),
        fontFamily: args.node.fontFamily(),
        fontStyle: args.node.fontStyle(),
        lineHeight: DEFAULT_TEXT_LINE_HEIGHT,
        width: worldWidth,
      });
      const computedWidth = fxComputeTextWidth({ document: portal.document }, { node: args.node, text: textToSet });
      const computedHeight = fxComputeTextHeight({
        fontSize: args.node.fontSize(),
        lineHeight: DEFAULT_TEXT_LINE_HEIGHT,
        padding: args.node.padding(),
        text: textToSet,
      });
      args.node.width(Math.max(worldWidth, measured.maxLineWidth, computedWidth));
      args.node.height(Math.max(worldHeight, measured.height, computedHeight));
    }

    args.node.visible(true);
    portal.scene.staticForegroundLayer.batchDraw();

    const nextNow = Date.now();
    const nextElement = fxSerializeTextNode(portal, {
      node: args.node,
      createdAt: originalElement.createdAt,
      updatedAt: nextNow,
    });
    const patchElements = [nextHostElement, nextElement].filter((element): element is TElement => element !== null);
    const commitResult = (() => {
      const builder = portal.crdt.build();
      patchElements.forEach((element) => {
        builder.patchElement(element.id, element);
      });
      return builder.commit();
    })();

    const selectedNode = findCurrentTextNode(portal, args.node.id()) ?? args.node;
    portal.selection.setSelection([selectedNode]);
    portal.selection.setFocusedNode(selectedNode);
    restoreTextSelectionLater(portal, { nodeId: args.node.id() });

    const didHostChange = JSON.stringify(nextHostElement) !== JSON.stringify(originalHostElement);
    if (textToSet === originalText && !didHostChange) {
      return;
    }

    const undoElement = structuredClone(originalElement);
    const redoElement = structuredClone(nextElement);
    const undoHostElement = originalHostElement ? structuredClone(originalHostElement) : null;
    const redoHostElement = nextHostElement ? structuredClone(nextHostElement) : null;

    portal.history.record({
      label: "edit-text",
      undo: () => {
        if (undoHostElement) {
          applyRuntimeElement(portal, { element: undoHostElement });
        }
        txUpdateTextNodeFromElement({ Konva: portal.Konva, scene: portal.scene, theme: portal.theme }, { element: undoElement, freeTextName: args.freeTextName });
        portal.scene.staticForegroundLayer.batchDraw();
        commitResult.rollback();
      },
      redo: () => {
        if (redoHostElement) {
          applyRuntimeElement(portal, { element: redoHostElement });
        }
        txUpdateTextNodeFromElement({ Konva: portal.Konva, scene: portal.scene, theme: portal.theme }, { element: redoElement, freeTextName: args.freeTextName });
        portal.scene.staticForegroundLayer.batchDraw();
        portal.crdt.applyOps({ ops: commitResult.redoOps });
      },
    });
  };

  const cancel = () => {
    suppressNextSelectionHandling(portal, { reason: "cancel" });
    cleanup();

    if (originalHostElement) {
      applyRuntimeElement(portal, { element: originalHostElement });
    }

    if (args.isNew) {
      args.node.destroy();
      portal.scene.staticForegroundLayer.batchDraw();
      portal.selection.clear();
      return;
    }

    args.node.visible(true);
    portal.scene.staticForegroundLayer.batchDraw();
  };

  const stopKeyPropagation = (event: KeyboardEvent) => {
    event.stopPropagation();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();

    if (event.key === "Escape") {
      event.preventDefault();
      textarea.blur();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const selectionStart = textarea.selectionStart ?? textarea.value.length;
      const selectionEnd = textarea.selectionEnd ?? selectionStart;
      textarea.setRangeText("\n", selectionStart, selectionEnd, "end");
      autoGrow();
    }
  };

  textarea.addEventListener("input", autoGrow);
  textarea.addEventListener("blur", commit, { once: true });
  textarea.addEventListener("keydown", onKeyDown);
  textarea.addEventListener("keyup", stopKeyPropagation);

  portal.scene.stage.container().appendChild(textarea);
  autoGrow();
  textarea.focus();
  textarea.select();
}
