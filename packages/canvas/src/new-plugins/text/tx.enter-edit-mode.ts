import { fxComputeTextHeight } from "./fn.compute-text-height";
import { fxComputeTextWidth } from "./fx.compute-text-width";
import { fxToElement } from "./fx.to-element";
import { txUpdateTextNodeFromElement } from "./tx.update-text-node-from-element";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type Konva from "konva";

export type TPortalEnterEditMode = {
  crdt: CrdtService;
  document: Document;
  editor: EditorService;
  history: HistoryService;
  render: RenderService;
  selection: SelectionService;
};

export type TArgsEnterEditMode = {
  freeTextName: string;
  isNew: boolean;
  node: Konva.Text;
};

export function txEnterEditMode(portal: TPortalEnterEditMode, args: TArgsEnterEditMode) {
  const now = Date.now();
  const originalElement = fxToElement({ render: portal.render }, { node: args.node, createdAt: now, updatedAt: now });
  const originalText = args.node.text();

  portal.editor.setEditingTextId(args.node.id());
  args.node.visible(false);
  portal.render.stage.batchDraw();

  const textarea = portal.document.createElement("textarea");
  const absolutePosition = args.node.getAbsolutePosition();
  const absoluteScale = args.node.getAbsoluteScale();
  const absoluteRotation = args.node.getAbsoluteRotation();
  const scaledFontSize = args.node.fontSize() * absoluteScale.x;
  const scaledWidth = Math.max(args.node.width() * absoluteScale.x, 4);

  const autoGrow = () => {
    textarea.style.width = "auto";
    textarea.style.width = `${Math.max(textarea.scrollWidth, scaledWidth)}px`;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, scaledFontSize)}px`;
  };

  textarea.value = args.node.text();
  Object.assign(textarea.style, {
    position: "absolute",
    top: `${absolutePosition.y}px`,
    left: `${absolutePosition.x}px`,
    width: `${scaledWidth}px`,
    minHeight: `${scaledFontSize}px`,
    fontSize: `${scaledFontSize}px`,
    fontFamily: args.node.fontFamily(),
    lineHeight: String(args.node.lineHeight()),
    transform: `rotate(${absoluteRotation}deg)`,
    transformOrigin: "top left",
    whiteSpace: "pre",
    outline: "2px solid #3b82f6",
    background: "transparent",
    border: "none",
    resize: "none",
    overflow: "hidden",
    padding: "0",
    boxSizing: "border-box",
    zIndex: "9999",
    color: "#000000",
  });

  const cleanup = () => {
    textarea.removeEventListener("input", autoGrow);
    textarea.removeEventListener("keydown", onKeyDown);
    textarea.removeEventListener("keyup", stopKeyPropagation);
    textarea.remove();
    portal.editor.setEditingTextId(null);
  };

  const commit = () => {
    const newText = textarea.value;
    const screenWidth = parseFloat(textarea.style.width) || scaledWidth;
    const screenHeight = parseFloat(textarea.style.height) || scaledFontSize;
    const worldWidth = screenWidth / absoluteScale.x;
    const worldHeight = screenHeight / absoluteScale.y;

    cleanup();

    if (args.isNew && newText === "") {
      args.node.destroy();
      portal.render.staticForegroundLayer.batchDraw();
      portal.crdt.deleteById({ elementIds: [args.node.id()] });
      portal.selection.clear();
      return;
    }

    const textToSet = !args.isNew && newText === "" ? originalText : newText;
    args.node.text(textToSet);
    args.node.width(Math.max(worldWidth, fxComputeTextWidth({ document: portal.document }, { node: args.node, text: textToSet })));
    args.node.height(Math.max(worldHeight, fxComputeTextHeight({ fontSize: args.node.fontSize(), lineHeight: args.node.lineHeight(), padding: args.node.padding(), text: textToSet })));
    args.node.visible(true);
    portal.render.staticForegroundLayer.batchDraw();

    const nextNow = Date.now();
    const nextElement = fxToElement({ render: portal.render }, { node: args.node, createdAt: originalElement.createdAt, updatedAt: nextNow });
    portal.crdt.patch({ elements: [nextElement], groups: [] });
    portal.selection.setSelection([args.node]);
    portal.selection.setFocusedNode(args.node);

    if (textToSet === originalText) {
      return;
    }

    const undoElement = structuredClone(originalElement);
    const redoElement = structuredClone(nextElement);

    portal.history.record({
      label: "edit-text",
      undo: () => {
        txUpdateTextNodeFromElement({ render: portal.render }, { element: undoElement, freeTextName: args.freeTextName });
        portal.render.staticForegroundLayer.batchDraw();
        portal.crdt.patch({ elements: [undoElement], groups: [] });
      },
      redo: () => {
        txUpdateTextNodeFromElement({ render: portal.render }, { element: redoElement, freeTextName: args.freeTextName });
        portal.render.staticForegroundLayer.batchDraw();
        portal.crdt.patch({ elements: [redoElement], groups: [] });
      },
    });
  };

  const cancel = () => {
    cleanup();

    if (args.isNew) {
      args.node.destroy();
      portal.render.staticForegroundLayer.batchDraw();
      portal.selection.clear();
      return;
    }

    args.node.visible(true);
    portal.render.staticForegroundLayer.batchDraw();
  };

  const stopKeyPropagation = (event: KeyboardEvent) => {
    event.stopPropagation();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();

    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
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

  portal.render.stage.container().appendChild(textarea);
  autoGrow();
  textarea.focus();
  textarea.select();
}
