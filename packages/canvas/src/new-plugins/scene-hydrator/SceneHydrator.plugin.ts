import type { IPlugin } from "@vibecanvas/runtime";
import type { TElement } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { IHooks } from "../../runtime";

type TSceneNode = Konva.Group | Konva.Shape;
type TSceneStateSnapshot = {
  selectionIds: string[];
  focusedId: string | null;
  editingTextId: string | null;
  editingShape1dId: string | null;
};

function compareElementsForHydration(left: TElement, right: TElement) {
  const zCompare = (left.zIndex ?? "").localeCompare(right.zIndex ?? "");
  if (zCompare !== 0) {
    return zCompare;
  }

  return left.id.localeCompare(right.id);
}

function captureSceneState(selection: SelectionService, editor: EditorService): TSceneStateSnapshot {
  return {
    selectionIds: selection.selection.map((node) => node.id()),
    focusedId: selection.focusedId,
    editingTextId: editor.editingTextId,
    editingShape1dId: editor.editingShape1dId,
  };
}

function findSceneNodeById(render: RenderService, id: string | null): TSceneNode | null {
  if (!id) {
    return null;
  }

  const node = render.staticForegroundLayer.findOne((candidate: Konva.Node) => {
    return (candidate instanceof render.Group || candidate instanceof render.Shape) && candidate.id() === id;
  });

  if (!(node instanceof render.Group) && !(node instanceof render.Shape)) {
    return null;
  }

  return node;
}

function restoreSceneState(render: RenderService, selection: SelectionService, editor: EditorService, snapshot: TSceneStateSnapshot) {
  const nextSelection = snapshot.selectionIds
    .map((id) => findSceneNodeById(render, id))
    .filter((node): node is TSceneNode => node !== null);

  selection.setSelection(nextSelection);
  selection.setFocusedId(findSceneNodeById(render, snapshot.focusedId)?.id() ?? null);
  editor.setEditingTextId(findSceneNodeById(render, snapshot.editingTextId)?.id() ?? null);
  editor.setEditingShape1dId(findSceneNodeById(render, snapshot.editingShape1dId)?.id() ?? null);
}

function loadCanvas(crdt: CrdtService, editor: EditorService, render: RenderService) {
  const doc = crdt.doc();
  const elements = Object.values(doc.elements)
    .filter((element) => element.parentGroupId === null)
    .sort(compareElementsForHydration);

  for (const element of elements) {
    const node = editor.createShapeFromTElement(element);
    if (!node) {
      continue;
    }

    render.staticForegroundLayer.add(node);
  }

  render.stage.batchDraw();
}

/**
 * Rebuilds runtime scene from CRDT document for migrated top-level elements.
 * Group hydration can come later with group plugin migration.
 */
export function createSceneHydratorPlugin(): IPlugin<{
  crdt: CrdtService;
  editor: EditorService;
  render: RenderService;
  selection: SelectionService;
}, IHooks> {
  return {
    name: "scene-hydrator",
    apply(ctx) {
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const render = ctx.services.require("render");
      const selection = ctx.services.require("selection");

      let destroyed = false;
      let isReloading = false;
      let reloadQueued = false;

      const reloadCanvas = async () => {
        if (destroyed) {
          return;
        }

        if (isReloading) {
          reloadQueued = true;
          return;
        }

        isReloading = true;

        try {
          const snapshot = captureSceneState(selection, editor);
          render.staticForegroundLayer.destroyChildren();
          loadCanvas(crdt, editor, render);
          restoreSceneState(render, selection, editor, snapshot);
        } finally {
          isReloading = false;
        }

        if (reloadQueued) {
          reloadQueued = false;
          await reloadCanvas();
        }
      };

      crdt.hooks.change.tap(() => {
        if (destroyed) {
          return;
        }

        if (crdt.consumePendingLocalChangeEvent()) {
          return;
        }

        void reloadCanvas();
      });

      ctx.hooks.initAsync.tapPromise(async () => {
        loadCanvas(crdt, editor, render);
      });

      ctx.hooks.destroy.tap(() => {
        destroyed = true;
      });
    },
  };
}
