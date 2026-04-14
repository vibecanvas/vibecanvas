import type Konva from "konva";
import { fxResolveSelectionStyleElements } from "./fx.resolve-selection-style-elements";
import { fxResolveSelectionStyleTextElements } from "./fx.resolve-selection-style-text-elements";
import {
  fnGetSelectionStyleStrokeColorKey,
  fnHasSelectionStylePropertySupport,
  type TSelectionStyleProperty,
} from "./fn.selection-style-menu";
import {
  fxCloneElementWithSelectionStyle,
  fxCreateSelectionStyleDataPatch,
} from "./fx.selection-style-element-patch";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { CrdtService } from "../services/crdt/CrdtService";
import type { EditorService } from "../services/editor/EditorService";
import type { HistoryService } from "../services/history/HistoryService";
import type { SceneService } from "../services/scene/SceneService";
import type { SelectionService } from "../services/selection/SelectionService";

export type TPortalApplySelectionStyleChange = {
  Konva: typeof Konva;
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  scene: SceneService;
  selection: SelectionService;
  fxFindAttachedTextNodeByContainerId: (containerId: string) => Konva.Text | null;
  txRefreshEditingShape1d: () => void;
  now: () => number;
};

export type TArgsApplySelectionStyleChange = {
  property: TSelectionStyleProperty;
  value: string | number;
};

function fnApplyElements(editor: EditorService, elements: TElement[]) {
  elements.forEach((element) => {
    editor.updateShapeFromTElement(element);
  });
}

function fnIsTextStyleProperty(property: TSelectionStyleProperty) {
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
    Konva: portal.Konva,
    editor: portal.editor,
    scene: portal.scene,
    selection: portal.selection,
  }, {});
  const targetElements = fnIsTextStyleProperty(args.property)
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
    if (!fnHasSelectionStylePropertySupport(element, args.property)) {
      return [];
    }

    if (args.property === "fill" && typeof args.value === "string") {
      return [fxCloneElementWithSelectionStyle({ now: portal.now }, { element, style: { backgroundColor: args.value } })];
    }

    if (args.property === "stroke" && typeof args.value === "string") {
      if (element.data.type === "pen" || element.data.type === "line" || element.data.type === "arrow") {
        const colorKey = fnGetSelectionStyleStrokeColorKey(element);
        return [fxCloneElementWithSelectionStyle({ now: portal.now }, { element, style: { [colorKey]: args.value } })];
      }

      const patches: TElement[] = [fxCloneElementWithSelectionStyle({ now: portal.now }, { element, style: { strokeColor: args.value } })];
      if (element.data.type === "rect") {
        const attachedTextNode = portal.fxFindAttachedTextNodeByContainerId(element.id);
        const attachedTextElement = attachedTextNode ? portal.editor.toElement(attachedTextNode) : null;
        if (attachedTextElement?.data.type === "text") {
          supplementalBeforeElements.set(attachedTextElement.id, structuredClone(attachedTextElement));
          patches.push(fxCloneElementWithSelectionStyle({ now: portal.now }, { element: attachedTextElement, style: { strokeColor: args.value } }));
        }
      }
      return patches;
    }

    if (args.property === "strokeWidth" && typeof args.value === "number") {
      return [fxCloneElementWithSelectionStyle({ now: portal.now }, { element, style: { strokeWidth: args.value } })];
    }

    if (args.property === "opacity" && typeof args.value === "number") {
      return [fxCloneElementWithSelectionStyle({ now: portal.now }, { element, style: { opacity: args.value } })];
    }

    if (typeof args.value === "string") {
      const patch = fxCreateSelectionStyleDataPatch({ now: portal.now }, { element, property: args.property, value: args.value });
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

  fnApplyElements(portal.editor, dedupedAfterElements);
  portal.txRefreshEditingShape1d();
  portal.crdt.patch({ elements: dedupedAfterElements, groups: [] });

  portal.history.record({
    label: `selection-style-${args.property}`,
    undo: () => {
      const revert = dedupedAfterElements
        .map((element) => beforeById.get(element.id))
        .filter((element): element is TElement => Boolean(element));
      fnApplyElements(portal.editor, revert);
      portal.txRefreshEditingShape1d();
      portal.crdt.patch({ elements: revert, groups: [] });
    },
    redo: () => {
      fnApplyElements(portal.editor, dedupedAfterElements);
      portal.txRefreshEditingShape1d();
      portal.crdt.patch({ elements: dedupedAfterElements, groups: [] });
    },
  });
}
