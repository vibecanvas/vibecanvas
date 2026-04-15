import type Konva from "konva";
import { fxResolveSelectionStyleElements } from "./fx.resolve-selection-style-elements";
import { fxResolveSelectionStyleTextElements } from "./fx.resolve-selection-style-text-elements";
import {
  fxGetSelectionStyleStrokeColorKey,
  fxHasSelectionStylePropertySupport,
  type TSelectionStyleProperty,
} from "./fn.selection-style-menu";
import {
  fxCloneElementWithSelectionStyle,
  fxCreateSelectionStyleDataPatch,
} from "./fx.selection-style-element-patch";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { CrdtService } from "../services/crdt/CrdtService";
import type { HistoryService } from "../services/history/HistoryService";
import type { SceneService } from "../services/scene/SceneService";
import type { SelectionService } from "../services/selection/SelectionService";
import type { TCanvasRegistrySelectionStyleConfig } from "../services/canvas-registry/CanvasRegistryService";

export type TApplySelectionStyleChangeEditor = {
  toElement(node: Konva.Node): TElement | null;
  toGroup(node: Konva.Node): unknown;
};

export type TApplySelectionStyleChangeCanvasRegistry = {
  updateElement(element: TElement): boolean;
  getSelectionStyleMenuConfigByElement(args: {
    element: TElement;
  }): TCanvasRegistrySelectionStyleConfig | null;
};

export type TPortalApplySelectionStyleChange = {
  Konva: typeof Konva;
  crdt: CrdtService;
  editor: TApplySelectionStyleChangeEditor;
  canvasRegistry: TApplySelectionStyleChangeCanvasRegistry;
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

function fnApplyElements(canvasRegistry: TApplySelectionStyleChangeCanvasRegistry, elements: TElement[]) {
  elements.forEach((element) => {
    canvasRegistry.updateElement(element);
  });
}

function fnIsTextStyleProperty(property: TSelectionStyleProperty) {
  return property === "fontFamily"
    || property === "fontSizePreset"
    || property === "textAlign"
    || property === "verticalAlign";
}

function fnIsDataStyleProperty(property: TSelectionStyleProperty): property is Extract<
  TSelectionStyleProperty,
  "fontFamily" | "fontSizePreset" | "textAlign" | "verticalAlign" | "lineType" | "startCap" | "endCap"
> {
  return property === "fontFamily"
    || property === "fontSizePreset"
    || property === "textAlign"
    || property === "verticalAlign"
    || property === "lineType"
    || property === "startCap"
    || property === "endCap";
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
    const config = portal.canvasRegistry.getSelectionStyleMenuConfigByElement({ element });
    if (!fxHasSelectionStylePropertySupport({ config, property: args.property })) {
      return [];
    }

    if (args.property === "fill" && typeof args.value === "string") {
      return [fxCloneElementWithSelectionStyle({ now: portal.now }, { element, style: { backgroundColor: args.value } })];
    }

    if (args.property === "stroke" && typeof args.value === "string") {
      if (element.data.type === "pen" || element.data.type === "line" || element.data.type === "arrow") {
        const colorKey = fxGetSelectionStyleStrokeColorKey(element);
        return [fxCloneElementWithSelectionStyle({ now: portal.now }, { element, style: { [colorKey]: args.value } })];
      }

      const patches: TElement[] = [fxCloneElementWithSelectionStyle({ now: portal.now }, { element, style: { strokeColor: args.value } })];
      if (element.data.type === "rect") {
        const attachedTextNode = portal.fxFindAttachedTextNodeByContainerId(element.id);
        const attachedTextElement = attachedTextNode ? portal.editor.toElement(attachedTextNode) : null;
        const attachedTextConfig = attachedTextElement
          ? portal.canvasRegistry.getSelectionStyleMenuConfigByElement({ element: attachedTextElement })
          : null;
        if (attachedTextElement?.data.type === "text" && fxHasSelectionStylePropertySupport({ config: attachedTextConfig, property: args.property })) {
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

    if (typeof args.value === "string" && fnIsDataStyleProperty(args.property)) {
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

  fnApplyElements(portal.canvasRegistry, dedupedAfterElements);
  portal.txRefreshEditingShape1d();

  const commitResult = (() => {
    const builder = portal.crdt.build();
    dedupedAfterElements.forEach((element) => {
      builder.patchElement(element.id, element);
    });
    return builder.commit();
  })();

  portal.history.record({
    label: `selection-style-${args.property}`,
    undo: () => {
      const revert = dedupedAfterElements
        .map((element) => beforeById.get(element.id))
        .filter((element): element is TElement => Boolean(element));
      fnApplyElements(portal.canvasRegistry, revert);
      portal.txRefreshEditingShape1d();
      commitResult.rollback();
    },
    redo: () => {
      fnApplyElements(portal.canvasRegistry, dedupedAfterElements);
      portal.txRefreshEditingShape1d();
      portal.crdt.applyOps({ ops: commitResult.redoOps });
    },
  });
}
