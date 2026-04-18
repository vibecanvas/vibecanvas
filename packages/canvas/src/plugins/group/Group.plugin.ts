import { throttle } from "@solid-primitives/scheduled";
import type { IPlugin } from "@vibecanvas/runtime";
import type { ThemeService } from "@vibecanvas/service-theme";
import type { TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import Konva from "konva";
import { VC_NODE_KIND_ATTR } from "../../core/CONSTANTS";
import { fnGetNodeZIndex } from "../../core/fn.get-node-z-index";
import { txSetNodeZIndex } from "../../core/tx.set-node-z-index";
import type { CameraService } from "../../services/camera/CameraService";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";
import type { ContextMenuService } from "../../services/context-menu/ContextMenuService";
import type { CrdtService } from "../../services/crdt/CrdtService";
import type { HistoryService } from "../../services/history/HistoryService";
import type { LoggingService } from "../../services/logging/LoggingService";
import type { RenderOrderService } from "../../services/render-order/RenderOrderService";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import { CanvasMode } from "../../services/selection/CONSTANTS";
import type { IRuntimeHooks } from "../../types";
import { fnIsCanvasGroupNode } from "../../core/fn.canvas-node-semantics";
import { txCreateGroupCloneDrag } from "./tx.create-group-clone-drag";
import { fnIsSceneNode } from "./fn.scene-node";
import { fnToGroupPatch } from "./fn.to-group-patch";
import { txGroupSelection } from "./tx.group-selection";
import { txSetupGroupNode } from "./tx.setup-group-node";
import { txSyncDraggability } from "./tx.sync-draggability";
import { fxCreateGroupBoundary } from "./fx.create-group-boundary";
import { txSyncGroupBoundaries, type TGroupBoundary } from "./tx.sync-group-boundaries";
import { txUngroupSelection } from "./tx.ungroup-selection";

const CANVAS_GROUP_NODE_KIND = "group";

const getNodeZIndex = (node: Konva.Group | Konva.Shape) => fnGetNodeZIndex({ node });
const setNodeZIndex = (node: Konva.Group | Konva.Shape, zIndex: string) => txSetNodeZIndex({}, { node, zIndex });

function createGroupNode(render: SceneService, group: TGroup) {
  const node = new Konva.Group({
    id: group.id,
    draggable: true,
  });

  node.setAttr(VC_NODE_KIND_ATTR, CANVAS_GROUP_NODE_KIND);
  node.setAttr("vcGroupCreatedAt", group.createdAt);
  setNodeZIndex(node, group.zIndex);
  return node;
}

function sortChildrenByPersistedOrder(render: SceneService, parent: Konva.Layer | Konva.Group) {
  const children = parent.getChildren().filter((node) => {
    return fnIsSceneNode({ render, node });
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
 */
export function createGroupPlugin(): IPlugin<{
  camera: CameraService;
  canvasRegistry: CanvasRegistryService;
  contextMenu: ContextMenuService;
  crdt: CrdtService;
  history: HistoryService;
  logging: LoggingService;
  scene: SceneService;
  renderOrder: RenderOrderService;
  selection: SelectionService;
  theme: ThemeService;
}, IRuntimeHooks> {
  return {
    name: "group",
    apply(ctx) {
      const camera = ctx.services.require("camera");
      const canvasRegistry = ctx.services.require("canvasRegistry");
      const contextMenu = ctx.services.require("contextMenu");
      const crdt = ctx.services.require("crdt");
      const history = ctx.services.require("history");
      const logging = ctx.services.require("logging");
      const render = ctx.services.require("scene");
      const renderOrder = ctx.services.require("renderOrder");
      const selection = ctx.services.require("selection");
      const theme = ctx.services.require("theme");
      const boundaries = new Map<string, TGroupBoundary>();

      const refreshBoundaries = () => {
        txSyncGroupBoundaries({
          canvasRegistry,
          render,
          selection,
          theme,
          boundaries,
          createGroupBoundary: (group) => fxCreateGroupBoundary({ Rect: Konva.Rect, render, theme }, { group }),
        }, {});
      };

      const syncDraggability = () => {
        txSyncDraggability({ Konva, canvasRegistry, render, selection }, {});
      };

      const setupNode = (group: Konva.Group) => {
        return txSetupGroupNode({
          canvasRegistry,
          crdt,
          history,
          logging,
          render,
          selection,
          hooks: ctx.hooks,
          Shape: Konva.Shape,
          refreshBoundaries,
          startCloneDrag: (groupNode) => {
            txCreateGroupCloneDrag({
              canvasRegistry,
              crdt,
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
          createThrottledPatch: (callback) => throttle(callback, 100),
          now: () => performance.now(),
        }, { group });
      };

      const runGroupSelection = () => {
        txGroupSelection({
          Group: Konva.Group,
          Shape: Konva.Shape,
          Layer: Konva.Layer,
          canvasRegistry,
          crdt,
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
          Group: Konva.Group,
          Shape: Konva.Shape,
          Layer: Konva.Layer,
          canvasRegistry,
          crdt,
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

      camera.hooks.change.tap(refreshBoundaries);

      theme.hooks.change.tap(() => {
        refreshBoundaries();
        render.dynamicLayer.batchDraw();
      });

      ctx.hooks.init.tap(() => {
        refreshBoundaries();
        syncDraggability();
      });

      contextMenu.registerProvider("group", ({ scope, activeSelection }) => {
        const selectedGroups = [...activeSelection].reverse().filter((node): node is Konva.Group => {
          return fnIsCanvasGroupNode(node);
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
        }

        return actions;
      });

      canvasRegistry.registerGroup({
        id: "group",
        matchesNode: (node) => {
          return node instanceof Konva.Group && node.getAttr(VC_NODE_KIND_ATTR) === CANVAS_GROUP_NODE_KIND;
        },
        toGroup: (node) => {
          if (!(node instanceof Konva.Group) || node.getAttr(VC_NODE_KIND_ATTR) !== CANVAS_GROUP_NODE_KIND) {
            return null;
          }

          return fnToGroupPatch({
            canvasRegistry,
            group: node,
            getNodeZIndex,
            fallbackCreatedAt: Date.now(),
          });
        },
        createNode: (group) => createGroupNode(render, group),
        attachListeners: (node) => {
          setupNode(node);
          return true;
        },
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
        canvasRegistry.unregisterGroup("group");
      });
    },
  };
}
