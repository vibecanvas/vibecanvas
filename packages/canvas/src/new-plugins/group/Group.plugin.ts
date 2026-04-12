import { throttle } from "@solid-primitives/scheduled";
import type { IPlugin } from "@vibecanvas/runtime";
import type { TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import { getNodeZIndex, setNodeZIndex } from "../../core/render-order";
import type { CameraService } from "../../new-services/camera/CameraService";
import type { ContextMenuService } from "../../new-services/context-menu/ContextMenuService";
import type { CrdtService } from "../../new-services/crdt/CrdtService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { HistoryService } from "../../new-services/history/HistoryService";
import type { RenderOrderService } from "../../new-services/render-order/RenderOrderService";
import type { RenderService } from "../../new-services/render/RenderService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import { CanvasMode } from "../../new-services/selection/enum";
import type { IHooks } from "../../runtime";
import { txCreateGroupCloneDrag } from "./tx.create-group-clone-drag";
import { fxIsSceneNode } from "./fn.scene-node";
import { fxToGroupPatch } from "./fn.to-group-patch";
import { txGroupSelection } from "./tx.group-selection";
import { txSetupGroupNode } from "./tx.setup-group-node";
import { txSyncDraggability } from "./tx.sync-draggability";
import { txSyncGroupBoundaries, type TGroupBoundary } from "./tx.sync-group-boundaries";
import { txUngroupSelection } from "./tx.ungroup-selection";
import { txDeleteSelection } from "../select/tx.delete-selection";

function createGroupNode(render: RenderService, group: TGroup) {
  const node = new render.Group({
    id: group.id,
    draggable: true,
  });

  node.setAttr("vcGroupCreatedAt", group.createdAt);
  setNodeZIndex(node, group.zIndex);
  return node;
}

function sortChildrenByPersistedOrder(render: RenderService, parent: Konva.Layer | Konva.Group) {
  const children = parent.getChildren().filter((node) => {
    return fxIsSceneNode({ render, node });
  });

  children
    .slice()
    .sort((left, right) => {
      const zCompare = getNodeZIndex(left).localeCompare(getNodeZIndex(right));
      if (zCompare !== 0) {
        return zCompare;
      }

      return left.id().localeCompare(right.id());
    })
    .forEach((child, index) => {
      child.zIndex(index);
    });
}

/**
 * Owns group node hydration, boundary UI, and basic group/ungroup behavior.
 * Clone-drag parity can come later.
 */
export function createGroupPlugin(): IPlugin<{
  camera: CameraService;
  contextMenu: ContextMenuService;
  crdt: CrdtService;
  editor: EditorService;
  history: HistoryService;
  render: RenderService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
}, IHooks> {
  return {
    name: "group",
    apply(ctx) {
      const camera = ctx.services.require("camera");
      const contextMenu = ctx.services.require("contextMenu");
      const crdt = ctx.services.require("crdt");
      const editor = ctx.services.require("editor");
      const history = ctx.services.require("history");
      const render = ctx.services.require("render");
      const renderOrder = ctx.services.require("renderOrder");
      const selection = ctx.services.require("selection");
      const boundaries = new Map<string, TGroupBoundary>();

      const refreshBoundaries = () => {
        txSyncGroupBoundaries({ render, selection, boundaries }, {});
      };

      const syncDraggability = () => {
        txSyncDraggability({ render, selection }, {});
      };

      const setupNode = (group: Konva.Group) => {
        return txSetupGroupNode({
          crdt,
          editor,
          history,
          render,
          selection,
          hooks: ctx.hooks,
          refreshBoundaries,
          startCloneDrag: (groupNode) => {
            txCreateGroupCloneDrag({
              crdt,
              editor,
              render,
              renderOrder,
              selection,
              setupGroupNode: setupNode,
              createId: () => crypto.randomUUID(),
              getNodeZIndex,
              setNodeZIndex,
            }, {
              sourceGroup: groupNode,
            });
          },
          createThrottledPatch: (callback) => {
            return throttle(callback, 100);
          },
        }, { group });
      };

      const runGroupSelection = () => {
        txGroupSelection({
          crdt,
          editor,
          history,
          render,
          selection,
          setupNode,
          createGroupNode: (group) => createGroupNode(render, group),
          sortChildrenByPersistedOrder: (parent) => sortChildrenByPersistedOrder(render, parent),
          getNodeZIndex,
          now: () => Date.now(),
          createId: () => crypto.randomUUID(),
        }, {});
      };

      const runUngroupSelection = () => {
        txUngroupSelection({
          crdt,
          editor,
          history,
          render,
          selection,
          setupNode,
          createGroupNode: (group) => createGroupNode(render, group),
          getNodeZIndex,
          now: () => Date.now(),
        }, {});
      };

      selection.hooks.change.tap(() => {
        refreshBoundaries();
        syncDraggability();
      });

      camera.hooks.change.tap(() => {
        refreshBoundaries();
      });

      ctx.hooks.init.tap(() => {
        refreshBoundaries();
        syncDraggability();
      });

      contextMenu.registerProvider("group", ({ scope, activeSelection }) => {
        const selectedGroups = [...activeSelection].reverse().filter((node): node is Konva.Group => {
          return node instanceof render.Group;
        });

        const actions = [] as Array<{
          id: string;
          label: string;
          disabled?: boolean;
          priority?: number;
          onSelect: () => void;
        }>;

        if (scope !== "canvas" && activeSelection.length > 1) {
          actions.push({
            id: "group-selection",
            label: "Group",
            priority: 200,
            onSelect: () => {
              selection.setSelection(activeSelection);
              runGroupSelection();
            },
          });
        }

        if (scope !== "canvas" && selectedGroups.length > 0) {
          actions.push({
            id: "ungroup-selection",
            label: "Ungroup",
            priority: 210,
            onSelect: () => {
              selection.setSelection(activeSelection);
              runUngroupSelection();
            },
          });
          actions.push({
            id: "delete-group-selection",
            label: "Delete",
            priority: 220,
            onSelect: () => {
              selection.setSelection(activeSelection);
              txDeleteSelection({ crdt, editor, history, render, renderOrder, selection }, {});
            },
          });
        }

        return actions;
      });

      editor.registerToGroup("group", (node) => {
        if (!(node instanceof render.Group)) {
          return null;
        }

        return fxToGroupPatch({
          render,
          group: node,
          getNodeZIndex,
          fallbackCreatedAt: Date.now(),
        });
      });

      editor.registerCreateGroupFromTGroup("group", (group) => {
        return setupNode(createGroupNode(render, group));
      });

      ctx.hooks.keydown.tap((event) => {
        if (selection.mode !== CanvasMode.SELECT) {
          return;
        }

        const isMeta = event.metaKey || event.ctrlKey;
        if (!isMeta || event.key.toLowerCase() !== "g") {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (event.shiftKey) {
          runUngroupSelection();
          return;
        }

        runGroupSelection();
      });

      ctx.hooks.destroy.tap(() => {
        boundaries.forEach((boundary) => {
          boundary.hide();
          boundary.node.destroy();
        });
        boundaries.clear();
        contextMenu.unregisterProvider("group");
        editor.unregisterToGroup("group");
        editor.unregisterCreateGroupFromTGroup("group");
      });
    },
  };
}
