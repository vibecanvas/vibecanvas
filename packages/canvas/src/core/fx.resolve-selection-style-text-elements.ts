import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { EditorService } from "../new-services/editor/EditorService";

export type TPortalResolveSelectionStyleTextElements = {
  editor: EditorService;
  fxFindAttachedTextNodeByContainerId: (containerId: string) => Konva.Text | null;
};

export type TArgsResolveSelectionStyleTextElements = {
  elements: TElement[];
};

function isShapeTextHost(type: string) {
  return type === "rect" || type === "ellipse" || type === "diamond";
}

export function fxResolveSelectionStyleTextElements(
  portal: TPortalResolveSelectionStyleTextElements,
  args: TArgsResolveSelectionStyleTextElements,
) {
  const seenElementIds = new Set<string>();
  const textElements: TElement[] = [];

  const pushElement = (element: TElement | null) => {
    if (!element || element.data.type !== "text") {
      return;
    }

    if (seenElementIds.has(element.id)) {
      return;
    }

    seenElementIds.add(element.id);
    textElements.push(element);
  };

  args.elements.forEach((element) => {
    if (element.data.type === "text") {
      pushElement(element);
      return;
    }

    if (!isShapeTextHost(element.data.type)) {
      return;
    }

    const attachedTextNode = portal.fxFindAttachedTextNodeByContainerId(element.id);
    pushElement(attachedTextNode ? portal.editor.toElement(attachedTextNode) : null);
  });

  return textElements;
}
