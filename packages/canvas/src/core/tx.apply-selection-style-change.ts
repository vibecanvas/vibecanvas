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

export type TSelectionStyleChangePlan = {
  beforeById: Map<string, TElement>;
  afterElements: TElement[];
};

export type TArgsCreateSelectionStyleChangePlan = TArgsApplySelectionStyleChange;
export type TArgsApplySelectionStyleChangeRuntime = {
  plan: TSelectionStyleChangePlan;
};
export type TArgsCommitSelectionStyleChange = {
  property: TSelectionStyleProperty;
  plan: TSelectionStyleChangePlan;
};

function fnApplyElements(canvasRegistry: TApplySelectionStyleChangeCanvasRegistry, elements: TElement[]) {
  elements.forEach((element) => {
    canvasRegistry.updateElement(element);
  });
}

function fnIsTextStyleProperty(property: TSelectionStyleProperty) {
  return property === "fontFamily"
    || property === "fontSize"
    || property === "textAlign"
    || property === "verticalAlign";
}

function fnIsDataStyleProperty(property: TSelectionStyleProperty): property is Extract<
  TSelectionStyleProperty,
  "fontFamily" | "fontSize" | "lineType" | "startCap" | "endCap"
> {
  return property === "fontFamily"
    || property === "fontSize"
    || property === "lineType"
    || property === "startCap"
    || property === "endCap";
}

export function txCreateSelectionStyleChangePlan(
  portal: TPortalApplySelectionStyleChange,
  args: TArgsCreateSelectionStyleChangePlan,
): TSelectionStyleChangePlan | null {
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

    if (args.property === "strokeWidth" && typeof args.value === "string") {
      return [fxCloneElementWithSelectionStyle({ now: portal.now }, { element, style: { strokeWidth: args.value } })];
    }

    if (args.property === "opacity" && typeof args.value === "number") {
      return [fxCloneElementWithSelectionStyle({ now: portal.now }, { element, style: { opacity: args.value } })];
    }

    if (args.property === "textAlign" && typeof args.value === "string") {
      return [fxCloneElementWithSelectionStyle({ now: portal.now }, {
        element,
        style: { textAlign: args.value as "left" | "center" | "right" },
      })];
    }

    if (args.property === "verticalAlign" && typeof args.value === "string") {
      return [fxCloneElementWithSelectionStyle({ now: portal.now }, {
        element,
        style: { verticalAlign: args.value as "top" | "middle" | "bottom" },
      })];
    }

    if (typeof args.value === "string" && fnIsDataStyleProperty(args.property)) {
      const patch = fxCreateSelectionStyleDataPatch({ now: portal.now }, { element, property: args.property, value: args.value });
      return patch ? [patch] : [];
    }

    return [];
  });

  const dedupedAfterElements = [...new Map(afterElements.map((element) => [element.id, element])).values()];
  if (dedupedAfterElements.length === 0) {
    return null;
  }

  const beforeById = new Map(beforeElements.map((element) => [element.id, element]));
  supplementalBeforeElements.forEach((element, id) => {
    beforeById.set(id, element);
  });

  return {
    beforeById,
    afterElements: dedupedAfterElements,
  };
}

export function txApplySelectionStyleChangeRuntime(
  portal: TPortalApplySelectionStyleChange,
  args: TArgsApplySelectionStyleChangeRuntime,
) {
  fnApplyElements(portal.canvasRegistry, args.plan.afterElements);
  portal.txRefreshEditingShape1d();
}

export function txCommitSelectionStyleChange(
  portal: TPortalApplySelectionStyleChange,
  args: TArgsCommitSelectionStyleChange,
) {
  const commitResult = (() => {
    const builder = portal.crdt.build();
    args.plan.afterElements.forEach((element) => {
      builder.patchElement(element.id, element);
    });
    return builder.commit();
  })();

  portal.history.record({
    label: `selection-style-${args.property}`,
    undo: () => {
      const revert = args.plan.afterElements
        .map((element) => args.plan.beforeById.get(element.id))
        .filter((element): element is TElement => Boolean(element));
      fnApplyElements(portal.canvasRegistry, revert);
      portal.txRefreshEditingShape1d();
      commitResult.rollback();
    },
    redo: () => {
      fnApplyElements(portal.canvasRegistry, args.plan.afterElements);
      portal.txRefreshEditingShape1d();
      portal.crdt.applyOps({ ops: commitResult.redoOps });
    },
  });
}

export function txApplySelectionStyleChange(
  portal: TPortalApplySelectionStyleChange,
  args: TArgsApplySelectionStyleChange,
) {
  const plan = txCreateSelectionStyleChangePlan(portal, args);
  if (!plan) {
    return null;
  }

  txApplySelectionStyleChangeRuntime(portal, { plan });
  txCommitSelectionStyleChange(portal, { property: args.property, plan });
  return plan;
}
