import type { TArrowData, TElement, TElementStyle, TLineData } from "@vibecanvas/shell/automerge/index";
import Konva from "konva";
import { createComponent, createMemo, createSignal } from "solid-js";
import { render } from "solid-js/web";
import { SelectionStyleMenu, type TSelectionStyleMenuSections, type TSelectionStyleMenuValues } from "../components/SelectionStyleMenu";
import type { TCapStyle, TFontFamily, TLineType } from "../components/SelectionStyleMenu/types";
import type { IPlugin, IPluginContext } from "./interface";
import { Shape1dPlugin } from "./Shape1d.plugin";
import { TextPlugin } from "./Text.plugin";
import { TransformPlugin } from "./Transform.plugin";

const SHAPE_TYPES = new Set(["rect", "ellipse", "diamond"]);
const PEN_TYPES = new Set(["pen"]);
const TEXT_TYPES = new Set(["text"]);
const LINE_TYPES = new Set(["line", "arrow"]);
const UNSUPPORTED_TYPES = new Set(["chat", "filetree", "terminal", "file", "image"]);

type TStylableProperty = "fill" | "stroke" | "strokeWidth" | "opacity" | "fontFamily" | "lineType" | "startCap" | "endCap";

type TResolvedSelection = {
  elements: TElement[];
};

function hasPropertySupport(element: TElement, property: TStylableProperty) {
  const type = element.data.type;

  if (property === "fill") return SHAPE_TYPES.has(type);
  if (property === "stroke") return SHAPE_TYPES.has(type) || PEN_TYPES.has(type) || TEXT_TYPES.has(type) || LINE_TYPES.has(type);
  if (property === "strokeWidth") return SHAPE_TYPES.has(type) || PEN_TYPES.has(type) || LINE_TYPES.has(type);
  if (property === "opacity") return !UNSUPPORTED_TYPES.has(type);
  if (property === "fontFamily") return TEXT_TYPES.has(type);
  if (property === "lineType") return LINE_TYPES.has(type);
  if (property === "startCap") return type === "arrow";
  if (property === "endCap") return type === "arrow";

  return false;
}

function cloneElementWithStyle(element: TElement, style: Partial<TElementStyle>): TElement {
  return {
    ...structuredClone(element),
    updatedAt: Date.now(),
    style: {
      ...structuredClone(element.style),
      ...style,
    },
  };
}

function getStrokeColorKey(element: TElement): "strokeColor" | "backgroundColor" {
  if ((element.data.type === "pen" || LINE_TYPES.has(element.data.type)) && typeof element.style.strokeColor !== "string" && typeof element.style.backgroundColor === "string") {
    return "backgroundColor";
  }

  return "strokeColor";
}

export class SelectionStyleMenuPlugin implements IPlugin {
  #mountElement: HTMLDivElement | null = null;
  #disposeRender: (() => void) | null = null;
  #version = createSignal(0);

  apply(context: IPluginContext): void {
    context.hooks.init.tap(() => {
      const mountElement = document.createElement("div");
      mountElement.className = "absolute inset-0 pointer-events-none z-50";
      context.stage.container().appendChild(mountElement);
      this.#mountElement = mountElement;

      this.#disposeRender = render(() => {
        const resolved = createMemo(() => {
          this.#version[0]();
          return this.getResolvedSelection(context);
        });
        const sections = createMemo(() => this.getVisibleSections(resolved().elements));
          const visible = createMemo(() => {
            if (context.state.editingTextId !== null) return false;
            const next = sections();
            return next.showFillPicker || next.showStrokeColorPicker || next.showStrokeWidthPicker || next.showTextPickers || next.showOpacityPicker || next.showLineTypePicker || next.showStartCapPicker || next.showEndCapPicker;
          });
        const values = createMemo(() => this.getCurrentValues(resolved().elements));

        return createComponent(SelectionStyleMenu, {
          visible,
          sections,
          values,
          colorStorageKey: "canvas-selection-style-menu",
          onFillChange: (color) => this.applyStyleChange(context, resolved(), "fill", color),
          onStrokeChange: (color) => this.applyStyleChange(context, resolved(), "stroke", color),
          onStrokeWidthChange: (width) => this.applyStyleChange(context, resolved(), "strokeWidth", width),
          onOpacityChange: (opacity) => this.applyStyleChange(context, resolved(), "opacity", opacity),
          onFontFamilyChange: (fontFamily) => this.applyStyleChange(context, resolved(), "fontFamily", fontFamily),
          onLineTypeChange: (lineType) => this.applyStyleChange(context, resolved(), "lineType", lineType),
          onStartCapChange: (capStyle) => this.applyStyleChange(context, resolved(), "startCap", capStyle),
          onEndCapChange: (capStyle) => this.applyStyleChange(context, resolved(), "endCap", capStyle),
        });
      }, mountElement);
    });

    context.hooks.destroy.tap(() => {
      this.#disposeRender?.();
      this.#mountElement?.remove();
      this.#disposeRender = null;
      this.#mountElement = null;
    });
  }

  private getResolvedSelection(context: IPluginContext): TResolvedSelection {
    const filteredSelection = TransformPlugin.filterSelection(context.state.selection);
    const rootNodes = filteredSelection.filter((node, index) => {
      return !filteredSelection.some((candidate, candidateIndex) => {
        if (candidateIndex === index) return false;
        return node.getAncestors().includes(candidate);
      });
    });
    const shapeNodes: Konva.Shape[] = [];
    const seenNodeIds = new Set<string>();

    const visitNode = (node: Konva.Group | Konva.Shape) => {
      if (seenNodeIds.has(node.id())) return;
      seenNodeIds.add(node.id());

      if (node instanceof Konva.Group) {
        node.getChildren().forEach((child) => {
          if (child instanceof Konva.Group || child instanceof Konva.Shape) {
            visitNode(child);
          }
        });
        return;
      }

      shapeNodes.push(node);
    };

    rootNodes.forEach(visitNode);

    const seenElementIds = new Set<string>();
    const elements = shapeNodes
      .map((node) => context.capabilities.toElement?.(node))
      .filter((element): element is TElement => Boolean(element))
      .filter((element) => !UNSUPPORTED_TYPES.has(element.data.type))
      .filter((element) => {
        if (seenElementIds.has(element.id)) return false;
        seenElementIds.add(element.id);
        return true;
      });

    return { elements };
  }

  private getVisibleSections(elements: TElement[]): TSelectionStyleMenuSections {
    if (elements.length === 0) {
        return {
          showFillPicker: false,
          showStrokeColorPicker: false,
          showStrokeWidthPicker: false,
          showTextPickers: false,
          showOpacityPicker: false,
          showLineTypePicker: false,
          showStartCapPicker: false,
          showEndCapPicker: false,
        };
      }

      return {
        showFillPicker: elements.some((element) => hasPropertySupport(element, "fill")),
        showStrokeColorPicker: elements.some((element) => hasPropertySupport(element, "stroke")),
        showStrokeWidthPicker: elements.some((element) => hasPropertySupport(element, "strokeWidth")),
        showTextPickers: elements.some((element) => hasPropertySupport(element, "fontFamily")),
        showOpacityPicker: elements.some((element) => hasPropertySupport(element, "opacity")),
        showLineTypePicker: elements.some((element) => hasPropertySupport(element, "lineType")),
        showStartCapPicker: elements.some((element) => hasPropertySupport(element, "startCap")),
        showEndCapPicker: elements.some((element) => hasPropertySupport(element, "endCap")),
      };
  }

  private getCurrentValues(elements: TElement[]): TSelectionStyleMenuValues {
    const fill = elements.find((element) => hasPropertySupport(element, "fill"));
    const stroke = elements.find((element) => hasPropertySupport(element, "stroke"));
    const width = elements.find((element) => hasPropertySupport(element, "strokeWidth"));
    const opacity = elements.find((element) => hasPropertySupport(element, "opacity"));
    const text = elements.find((element) => hasPropertySupport(element, "fontFamily"));
    const line = elements.find((element) => hasPropertySupport(element, "lineType"));
    const arrow = elements.find((element) => element.data.type === "arrow");

    return {
      fillColor: fill?.style.backgroundColor,
      strokeColor: stroke?.style.strokeColor ?? stroke?.style.backgroundColor,
      strokeWidth: width?.style.strokeWidth,
      opacity: opacity?.style.opacity,
      fontFamily: text?.data.type === "text" ? text.data.fontFamily as TFontFamily : undefined,
      lineType: line?.data.type === "line" || line?.data.type === "arrow" ? line.data.lineType as TLineType : undefined,
      startCap: arrow?.data.type === "arrow" ? arrow.data.startCap as TCapStyle : undefined,
      endCap: arrow?.data.type === "arrow" ? arrow.data.endCap as TCapStyle : undefined,
    };
  }

  private applyStyleChange(
    context: IPluginContext,
    resolved: TResolvedSelection,
    property: TStylableProperty,
    value: string | number,
  ) {
    const beforeElements = resolved.elements.map((element) => structuredClone(element));
    const supplementalBeforeElements = new Map<string, TElement>();
    const afterElements = resolved.elements.flatMap((element) => {
      if (!hasPropertySupport(element, property)) return [];

      if (property === "fill" && typeof value === "string") {
        return [cloneElementWithStyle(element, { backgroundColor: value })];
      }

      if (property === "stroke" && typeof value === "string") {
        if (element.data.type === "pen" || LINE_TYPES.has(element.data.type)) {
          const colorKey = getStrokeColorKey(element);
          return [cloneElementWithStyle(element, { [colorKey]: value })];
        }

        const patches: TElement[] = [cloneElementWithStyle(element, { strokeColor: value })];
        if (element.data.type === "rect") {
          const attachedTextNode = TextPlugin.findAttachedTextByContainerId(context, element.id);
          if (attachedTextNode) {
            const attachedTextElement = context.capabilities.toElement?.(attachedTextNode);
            if (attachedTextElement?.data.type === "text") {
              supplementalBeforeElements.set(attachedTextElement.id, structuredClone(attachedTextElement));
              patches.push(cloneElementWithStyle(attachedTextElement, { strokeColor: value }));
            }
          }
        }
        return patches;
      }

      if (property === "strokeWidth" && typeof value === "number") {
        return [cloneElementWithStyle(element, { strokeWidth: value })];
      }

      if (property === "opacity" && typeof value === "number") {
        return [cloneElementWithStyle(element, { opacity: value })];
      }

      if (property === "fontFamily" && typeof value === "string" && element.data.type === "text") {
        return [{
          ...structuredClone(element),
          updatedAt: Date.now(),
          data: {
            ...element.data,
            fontFamily: value,
          },
        }];
      }

      if (property === "lineType" && typeof value === "string" && LINE_TYPES.has(element.data.type)) {
        return [{
          ...structuredClone(element),
          updatedAt: Date.now(),
          data: {
            ...structuredClone(element.data),
            lineType: value as TLineType,
          } as TLineData | TArrowData,
        }];
      }

      if (property === "startCap" && typeof value === "string" && element.data.type === "arrow") {
        return [{
          ...structuredClone(element),
          updatedAt: Date.now(),
          data: {
            ...structuredClone(element.data),
            startCap: value as TCapStyle,
          },
        }];
      }

      if (property === "endCap" && typeof value === "string" && element.data.type === "arrow") {
        return [{
          ...structuredClone(element),
          updatedAt: Date.now(),
          data: {
            ...structuredClone(element.data),
            endCap: value as TCapStyle,
          },
        }];
      }

      return [];
    });

    const dedupedAfterElements = [...new Map(afterElements.map((element) => [element.id, element])).values()];

    if (dedupedAfterElements.length === 0) return;

    const beforeById = new Map(beforeElements.map((element) => [element.id, element]));
    supplementalBeforeElements.forEach((element, id) => beforeById.set(id, element));
    dedupedAfterElements.forEach((element) => context.capabilities.updateShapeFromTElement?.(element));
    if (context.state.editingShape1dId !== null) {
      const editingNode = Shape1dPlugin.findShape1dNodeById(context, context.state.editingShape1dId);
      editingNode?.getLayer()?.batchDraw();
    }
    context.crdt.patch({ elements: dedupedAfterElements, groups: [] });
    this.#version[1]((value) => value + 1);

    context.history.record({
      label: `selection-style-${property}`,
      undo: () => {
        const revert = dedupedAfterElements
          .map((element) => beforeById.get(element.id))
          .filter((element): element is TElement => Boolean(element));
        revert.forEach((element) => context.capabilities.updateShapeFromTElement?.(element));
        context.crdt.patch({ elements: revert, groups: [] });
        this.#version[1]((value) => value + 1);
      },
      redo: () => {
        dedupedAfterElements.forEach((element) => context.capabilities.updateShapeFromTElement?.(element));
        context.crdt.patch({ elements: dedupedAfterElements, groups: [] });
        this.#version[1]((value) => value + 1);
      },
    });
  }
}
