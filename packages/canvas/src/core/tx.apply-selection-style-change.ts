import type Konva from "konva";
import { fxResolveSelectionStyleElements } from "./fx.resolve-selection-style-elements";
import { fxResolveSelectionStyleTextElements } from "./fx.resolve-selection-style-text-elements";
import {
  fxCloneElementWithSelectionStyle,
  fxCreateSelectionStyleDataPatch,
  fxGetSelectionStyleStrokeColorKey,
  fxHasSelectionStylePropertySupport,
  type TSelectionStyleProperty,
} from "./fn.selection-style-menu";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { CrdtService } from "../new-services/crdt/CrdtService";
import type { EditorService } from "../new-services/editor/EditorService";
import type { HistoryService } from "../new-services/history/HistoryService";
import type { RenderService } from "../new-services/render/RenderService";
import type { SelectionService } from "../new-services/selection/SelectionService";

export type TPortalApplySelectionStyleChange = {
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: RenderService;
  selection: SelectionService;
  fxFindAttachedTextNodeByContainerId: (containerId: string) => Konva.Text | null;
  txRefreshEditingShape1d: () => void;
};

export type TArgsApplySelectionStyleChange = {
  property: TSelectionStyleProperty;
  value: string | number;
};

function applyElements(editor: EditorService, elements: TElement[]) {
  elements.forEach((element) => {
    editor.updateShapeFromTElement(element);
  });
}

function isTextStyleProperty(property: TSelectionStyleProperty) {
  return property === "fontFamily"
    || property === "fontSizePreset"
    || property === "textAlign"
    || property === "verticalAlign";
}

export function txApplySelectionStyleChange(
  portal: TPortalApplySelectionStyleChange,
  args: TArgsApplySelectionStyleChange,
) {
  const resolvedElements = fxResolveSelectionStyleElements({
    editor: portal.editor,
    render: portal.render,
    selection: portal.selection,
  }, {});
  const targetElements = isTextStyleProperty(args.property)
    ? fxResolveSelectionStyleTextElements({
      editor: portal.editor,
      fxFindAttachedTextNodeByContainerId: portal.fxFindAttachedTextNodeByContainerId,
    }, {
      elements: resolvedElements,
    })
    : resolvedElements;
  const beforeElements = targetElements.map((element) => structuredClone(element));
  const supplementalBeforeElements = new Map<string, TElement>();
  const afterElements = targetElements.flatMap((element) => {
    if (!fxHasSelectionStylePropertySupport(element, args.property)) {
      return [];
    }

    if (args.property === "fill" && typeof args.value === "string") {
      return [fxCloneElementWithSelectionStyle(element, { backgroundColor: args.value })];
    }

    if (args.property === "stroke" && typeof args.value === "string") {
      if (element.data.type === "pen" || element.data.type === "line" || element.data.type === "arrow") {
        const colorKey = fxGetSelectionStyleStrokeColorKey(element);
        return [fxCloneElementWithSelectionStyle(element, { [colorKey]: args.value })];
      }

      const patches: TElement[] = [fxCloneElementWithSelectionStyle(element, { strokeColor: args.value })];
      if (element.data.type === "rect") {
        const attachedTextNode = portal.fxFindAttachedTextNodeByContainerId(element.id);
        const attachedTextElement = attachedTextNode ? portal.editor.toElement(attachedTextNode) : null;
        if (attachedTextElement?.data.type === "text") {
          supplementalBeforeElements.set(attachedTextElement.id, structuredClone(attachedTextElement));
          patches.push(fxCloneElementWithSelectionStyle(attachedTextElement, { strokeColor: args.value }));
        }
      }
      return patches;
    }

    if (args.property === "strokeWidth" && typeof args.value === "number") {
      return [fxCloneElementWithSelectionStyle(element, { strokeWidth: args.value })];
    }

    if (args.property === "opacity" && typeof args.value === "number") {
      return [fxCloneElementWithSelectionStyle(element, { opacity: args.value })];
    }

    if (typeof args.value === "string") {
      const patch = fxCreateSelectionStyleDataPatch(element, args.property, args.value);
      return patch ? [patch] : [];
    }

    return [];
  });

  const dedupedAfterElements = [...new Map(afterElements.map((element) => [element.id, element])).values()];
  if (dedupedAfterElements.length === 0) {
    return;
  }

  const beforeById = new Map(beforeElements.map((element) => [element.id, element]));
  supplementalBeforeElements.forEach((element, id) => {
    beforeById.set(id, element);
  });

  applyElements(portal.editor, dedupedAfterElements);
  portal.txRefreshEditingShape1d();
  portal.crdt.patch({ elements: dedupedAfterElements, groups: [] });

  portal.history.record({
    label: `selection-style-${args.property}`,
    undo: () => {
      const revert = dedupedAfterElements
        .map((element) => beforeById.get(element.id))
        .filter((element): element is TElement => Boolean(element));
      applyElements(portal.editor, revert);
      portal.txRefreshEditingShape1d();
      portal.crdt.patch({ elements: revert, groups: [] });
    },
    redo: () => {
      applyElements(portal.editor, dedupedAfterElements);
      portal.txRefreshEditingShape1d();
      portal.crdt.patch({ elements: dedupedAfterElements, groups: [] });
    },
  });
}
