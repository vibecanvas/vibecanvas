import type { IPlugin } from "@vibecanvas/runtime";
import type { TElement, TElementStyle, TTextData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { IHooks } from "../../runtime";
import { CanvasMode } from "../../new-services/selection/enum";

const FREE_TEXT_NAME = "free-text";

function getWorldPosition(node: Konva.Node) {
  const absolutePosition = node.absolutePosition();
  const parent = node.getParent();
  const parentTransform = parent?.getAbsoluteTransform().copy();

  if (!parentTransform) {
    return absolutePosition;
  }

  return parentTransform.invert().point(absolutePosition);
}

function setWorldPosition(node: Konva.Node, position: { x: number; y: number }) {
  const parent = node.getParent();
  const parentTransform = parent?.getAbsoluteTransform().copy();

  if (!parentTransform) {
    node.position(position);
    return;
  }

  const absolutePosition = parentTransform.point(position);
  node.absolutePosition(absolutePosition);
}

function computeTextWidth(node: Konva.Text, text: string) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return Math.max(node.width(), 4);
  }

  context.font = `${node.fontSize()}px ${node.fontFamily()}`;
  const maxLineWidth = text.split("\n").reduce((max, line) => {
    return Math.max(max, context.measureText(line).width);
  }, 0);

  return Math.ceil(maxLineWidth) + node.padding() * 2;
}

function computeTextHeight(node: Konva.Text, text: string) {
  const lineCount = (text.match(/\n/g)?.length ?? 0) + 1;
  return Math.ceil(lineCount * node.fontSize() * node.lineHeight()) + node.padding() * 2;
}

function createTextElement(args: { id: string; x: number; y: number }) {
  return {
    id: args.id,
    x: args.x,
    y: args.y,
    rotation: 0,
    bindings: [],
    locked: false,
    parentGroupId: null,
    zIndex: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    style: {},
    data: {
      type: "text",
      w: 200,
      h: 24,
      text: "",
      originalText: "",
      fontSize: 16,
      fontFamily: "Arial",
      textAlign: "left",
      verticalAlign: "top",
      lineHeight: 1.2,
      link: null,
      containerId: null,
      autoResize: true,
    },
  } satisfies TElement;
}

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

function toElement(render: RenderService, node: Konva.Text): TElement {
  const worldPosition = getWorldPosition(node);
  const absoluteScale = node.getAbsoluteScale();
  const layer = node.getLayer();
  const layerScaleX = layer?.scaleX() ?? 1;
  const layerScaleY = layer?.scaleY() ?? 1;
  const parent = node.getParent();
  const parentGroupId = parent instanceof render.Group ? parent.id() : null;

  const style: TElementStyle = { opacity: node.opacity() };
  const fill = node.fill();
  if (typeof fill === "string") {
    style.strokeColor = fill;
  }

  const data: TTextData = {
    type: "text",
    w: node.width() * (absoluteScale.x / layerScaleX),
    h: node.height() * (absoluteScale.y / layerScaleY),
    text: node.text(),
    originalText: node.text(),
    fontSize: node.fontSize(),
    fontFamily: node.fontFamily(),
    textAlign: node.align() as TTextData["textAlign"],
    verticalAlign: node.verticalAlign() as TTextData["verticalAlign"],
    lineHeight: node.lineHeight(),
    link: null,
    containerId: null,
    autoResize: false,
  };

  return {
    id: node.id(),
    x: worldPosition.x,
    y: worldPosition.y,
    rotation: node.getAbsoluteRotation(),
    bindings: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    locked: false,
    parentGroupId,
    zIndex: "",
    style,
    data,
  };
}

function updateTextNodeFromElement(args: {
  render: RenderService;
  element: TElement;
}) {
  if (args.element.data.type !== "text") {
    return false;
  }

  const node = args.render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return candidate instanceof args.render.Text && candidate.id() === args.element.id;
  });
  if (!(node instanceof args.render.Text)) {
    return false;
  }

  const data = args.element.data as TTextData;
  setWorldPosition(node, { x: args.element.x, y: args.element.y });
  node.rotation(args.element.rotation);
  node.width(data.w);
  node.height(data.h);
  node.text(data.text);
  node.fontSize(data.fontSize);
  node.fontFamily(data.fontFamily);
  node.align(data.textAlign);
  node.verticalAlign(data.verticalAlign);
  node.lineHeight(data.lineHeight);
  node.opacity(args.element.style.opacity ?? 1);
  node.fill(args.element.style.strokeColor ?? "#000000");
  node.scale({ x: 1, y: 1 });
  node.wrap("none");
  node.listening(true);
  node.draggable(true);
  node.name(FREE_TEXT_NAME);
  return true;
}

function enterEditMode(args: {
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: RenderService;
  selection: SelectionService;
  node: Konva.Text;
  isNew: boolean;
}) {
  const originalElement = toElement(args.render, args.node);
  const originalText = args.node.text();

  args.editor.setEditingTextId(args.node.id());
  args.node.visible(false);
  args.render.stage.batchDraw();

  const textarea = document.createElement("textarea");
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
    args.editor.setEditingTextId(null);
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
      args.render.staticForegroundLayer.batchDraw();
      args.crdt.deleteById({ elementIds: [args.node.id()] });
      args.selection.clear();
      return;
    }

    const textToSet = !args.isNew && newText === "" ? originalText : newText;
    args.node.text(textToSet);
    args.node.width(Math.max(worldWidth, computeTextWidth(args.node, textToSet)));
    args.node.height(Math.max(worldHeight, computeTextHeight(args.node, textToSet)));
    args.node.visible(true);
    args.render.staticForegroundLayer.batchDraw();

    const nextElement = toElement(args.render, args.node);
    args.crdt.patch({ elements: [nextElement], groups: [] });
    args.selection.setSelection([args.node]);
    args.selection.setFocusedNode(args.node);

    if (textToSet === originalText) {
      return;
    }

    const undoElement = structuredClone(originalElement);
    const redoElement = structuredClone(nextElement);

    args.history.record({
      label: "edit-text",
      undo: () => {
        updateTextNodeFromElement({ render: args.render, element: undoElement });
        args.render.staticForegroundLayer.batchDraw();
        args.crdt.patch({ elements: [undoElement], groups: [] });
      },
      redo: () => {
        updateTextNodeFromElement({ render: args.render, element: redoElement });
        args.render.staticForegroundLayer.batchDraw();
        args.crdt.patch({ elements: [redoElement], groups: [] });
      },
    });
  };

  const cancel = () => {
    cleanup();

    if (args.isNew) {
      args.node.destroy();
      args.render.staticForegroundLayer.batchDraw();
      args.selection.clear();
      return;
    }

    args.node.visible(true);
    args.render.staticForegroundLayer.batchDraw();
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

  args.render.stage.container().appendChild(textarea);
  autoGrow();
  textarea.focus();
  textarea.select();
}

function setupTextNode(args: {
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: RenderService;
  selection: SelectionService;
  hooks: IHooks;
  node: Konva.Text;
}) {
  let beforeDragElement: TElement | null = null;

  args.node.on("pointerclick", (event) => {
    args.hooks.elementPointerClick.call(event);
  });

  args.node.on("pointerdown", (event) => {
    const didHandle = args.hooks.elementPointerDown.call(event);
    if (didHandle) {
      event.cancelBubble = true;
    }
  });

  args.node.on("pointerdblclick", (event) => {
    const didHandle = args.hooks.elementPointerDoubleClick.call(event);
    if (didHandle) {
      event.cancelBubble = true;
    }
  });

  args.node.on("transform", () => {
    const scaleX = args.node.scaleX();
    const scaleY = args.node.scaleY();
    args.node.setAttrs({
      width: args.node.width() * scaleX,
      height: args.node.height() * scaleY,
      fontSize: Math.max(1, args.node.fontSize() * scaleX),
      scaleX: 1,
      scaleY: 1,
    });
  });

  args.node.on("dragstart", () => {
    beforeDragElement = toElement(args.render, args.node);
  });

  args.node.on("dragend", () => {
    const afterDragElement = toElement(args.render, args.node);
    args.crdt.patch({ elements: [afterDragElement], groups: [] });

    if (!beforeDragElement) {
      return;
    }

    const didMove = beforeDragElement.x !== afterDragElement.x || beforeDragElement.y !== afterDragElement.y;
    if (!didMove) {
      beforeDragElement = null;
      return;
    }

    const undoElement = structuredClone(beforeDragElement);
    const redoElement = structuredClone(afterDragElement);
    beforeDragElement = null;

    args.history.record({
      label: "drag-text",
      undo: () => {
        updateTextNodeFromElement({ render: args.render, element: undoElement });
        args.render.staticForegroundLayer.batchDraw();
        args.crdt.patch({ elements: [undoElement], groups: [] });
      },
      redo: () => {
        updateTextNodeFromElement({ render: args.render, element: redoElement });
        args.render.staticForegroundLayer.batchDraw();
        args.crdt.patch({ elements: [redoElement], groups: [] });
      },
    });
  });
}

/**
 * Owns free-text create, edit, drag, and editor transform registries.
 * Attached-text and clone-drag parity can come later.
 */
export function createTextPlugin(): IPlugin<{
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: RenderService;
  selection: SelectionService;
}, IHooks> {
  return {
    name: "text",
    apply(ctx) {
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const history = ctx.services.require("history");
      const render = ctx.services.require("render");
      const selection = ctx.services.require("selection");

      const setupNode = (node: Konva.Text) => {
        setupTextNode({ crdt, editor, history, render, selection, hooks: ctx.hooks, node });
        return node;
      };

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

        return toElement(render, node);
      });

      editor.registerUpdateShapeFromTElement("text", (element) => {
        return updateTextNodeFromElement({ render, element });
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

        const element = createTextElement({
          id: crypto.randomUUID(),
          x: pointer.x,
          y: pointer.y,
        });
        const node = setupNode(createTextNode(render, element));

        render.staticForegroundLayer.add(node);
        render.staticForegroundLayer.batchDraw();
        selection.setSelection([node]);
        selection.setFocusedNode(node);
        editor.setActiveTool("select");

        enterEditMode({
          crdt,
          editor,
          history,
          render,
          selection,
          node,
          isNew: true,
        });
      });

      ctx.hooks.elementPointerDoubleClick.tap((event) => {
        if (!(event.currentTarget instanceof render.Text)) {
          return false;
        }

        if (event.currentTarget.name() !== FREE_TEXT_NAME) {
          return false;
        }

        enterEditMode({
          crdt,
          editor,
          history,
          render,
          selection,
          node: event.currentTarget,
          isNew: false,
        });
        return true;
      });

      ctx.hooks.destroy.tap(() => {
        editor.unregisterTool("text");
        editor.unregisterToElement("text");
        editor.unregisterUpdateShapeFromTElement("text");
      });
    },
  };
}
