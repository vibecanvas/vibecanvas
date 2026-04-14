import type { IPlugin } from "@vibecanvas/runtime";
import Konva from "konva";
import { fxIsCanvasGroupNode, fxIsCanvasNode } from "../../core/fx.canvas-node-semantics";
import { createComponent, createMemo, createSignal } from "solid-js";
import { render as renderSolid } from "solid-js/web";
import { CanvasContextMenu } from "../../components/CanvasContextMenu";
import type { ContextMenuService, TContextMenuNode, TContextMenuScope } from "../../new-services/context-menu/ContextMenuService";
import type { EditorService } from "../../new-services/editor/EditorService";
import type { SceneService } from "../../new-services/scene/SceneService";
import type { SelectionService } from "../../new-services/selection/SelectionService";
import type { IHooks } from "../../runtime";

function getSelectionPath(scene: SceneService, editor: EditorService, node: TContextMenuNode): TContextMenuNode[] {
  const path: TContextMenuNode[] = [];
  let current: Konva.Node | null = node;

  while (current && current !== scene.staticForegroundLayer) {
    if (fxIsCanvasNode({}, { editor, node: current })) {
      path.push(current as TContextMenuNode);
    }

    current = current.getParent();
  }

  return path.reverse();
}

function filterSelection(scene: SceneService, editor: EditorService, selection: Konva.Node[]): TContextMenuNode[] {
  void scene;

  let subSelection = selection.find((node) => fxIsCanvasGroupNode({}, { editor, node: node.getParent() }));
  if (!subSelection) {
    return selection.filter((node): node is TContextMenuNode => {
      return fxIsCanvasNode({}, { editor, node }) && node.getStage() !== null;
    });
  }

  const findDeepestSubSelection = () => {
    const deeperSubSelection = selection.find((node) => node.getParent() === subSelection);
    if (!deeperSubSelection) {
      return;
    }

    subSelection = deeperSubSelection;
    findDeepestSubSelection();
  };

  findDeepestSubSelection();

  if (!fxIsCanvasNode({}, { editor, node: subSelection })) {
    return [];
  }

  return subSelection.getStage() !== null ? [subSelection as TContextMenuNode] : [];
}

function findTargetNode(scene: SceneService, editor: EditorService, pointer: { x: number; y: number }): TContextMenuNode | null {
  const directHit = scene.stage.getIntersection(pointer);
  let current: Konva.Node | null = directHit;
  while (current) {
    if (fxIsCanvasNode({}, { editor, node: current })) {
      return current as TContextMenuNode;
    }

    current = current.getParent();
  }

  const candidates = scene.staticForegroundLayer.find((node: Konva.Node) => {
    return fxIsCanvasNode({}, { editor, node }) && node.isListening();
  }) as TContextMenuNode[];

  const fallbackTarget = [...candidates].reverse().find((node) => {
    const box = node.getClientRect();
    return Konva.Util.haveIntersection(box, {
      x: pointer.x,
      y: pointer.y,
      width: 1,
      height: 1,
    });
  });

  return fallbackTarget ?? null;
}

function resolveSelection(scene: SceneService, editor: EditorService, selection: SelectionService, target: TContextMenuNode): TContextMenuNode[] {
  const activeSelection = filterSelection(scene, editor, selection.selection);
  if (activeSelection.includes(target)) {
    return selection.selection.filter((node): node is TContextMenuNode => {
      return fxIsCanvasNode({}, { editor, node });
    });
  }

  const path = getSelectionPath(scene, editor, target);
  const nextDepth = Math.min(Math.max(selection.selection.length, 1), path.length);
  return path.slice(0, nextDepth);
}

function getMenuScope(targetNode: TContextMenuNode | null, selection: TContextMenuNode[]): TContextMenuScope {
  if (!targetNode) {
    return "canvas";
  }

  return selection.length > 1 ? "selection" : "item";
}

function mountContextMenu(args: {
  scene: SceneService;
  contextMenu: ContextMenuService;
}) {
  const mountElement = args.scene.container.ownerDocument.createElement("div");
  mountElement.className = "absolute inset-0 pointer-events-none";
  args.scene.stage.container().appendChild(mountElement);

  const [version, setVersion] = createSignal(0);
  const mounted = createMemo(() => {
    version();
    return args.contextMenu.open;
  });
  const x = createMemo(() => {
    version();
    return args.contextMenu.x;
  });
  const y = createMemo(() => {
    version();
    return args.contextMenu.y;
  });
  const items = createMemo(() => {
    version();
    return args.contextMenu.actions;
  });
  const openRequestId = createMemo(() => {
    version();
    return args.contextMenu.requestId;
  });

  const syncVersion = () => {
    setVersion((value) => value + 1);
  };

  args.contextMenu.hooks.stateChange.tap(syncVersion);
  args.contextMenu.hooks.providersChange.tap(syncVersion);

  const disposeRender = renderSolid(() => {
    return createComponent(CanvasContextMenu, {
      mounted,
      x,
      y,
      items,
      openRequestId,
      onOpenChange: (open) => {
        if (open) {
          return;
        }

        args.contextMenu.close();
      },
    });
  }, mountElement);

  return {
    mountElement,
    dispose() {
      disposeRender();
      mountElement.remove();
    },
  };
}

/**
 * Owns right-click hit testing and Solid context menu mount.
 * Feature actions come from ContextMenuService providers.
 */
export function createContextMenuPlugin(): IPlugin<{
  contextMenu: ContextMenuService;
  editor: EditorService;
  scene: SceneService;
  selection: SelectionService;
}, IHooks> {
  let menuMount: ReturnType<typeof mountContextMenu> | null = null;

  return {
    name: "context-menu",
    apply(ctx) {
      const contextMenu = ctx.services.require("contextMenu");
      const editor = ctx.services.require("editor");
      const scene = ctx.services.require("scene");
      const selection = ctx.services.require("selection");

      ctx.hooks.init.tap(() => {
        menuMount = mountContextMenu({ scene, contextMenu });

        const onContextMenu = (event: MouseEvent) => {
          const target = event.target as Node | null;
          if (target && menuMount?.mountElement.contains(target)) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          scene.stage.setPointersPositions(event);
          const pointer = scene.stage.getPointerPosition();
          const targetNode = pointer ? findTargetNode(scene, editor, pointer) : null;
          const nextSelection = targetNode
            ? resolveSelection(scene, editor, selection, targetNode)
            : selection.selection.filter((node): node is TContextMenuNode => {
              return fxIsCanvasNode({}, { editor, node });
            });
          const activeSelection = filterSelection(scene, editor, nextSelection);
          const scope = getMenuScope(targetNode, nextSelection);

          if (targetNode) {
            selection.setSelection(nextSelection);
          }

          contextMenu.openAt({
            x: event.clientX,
            y: event.clientY,
            context: {
              scope,
              targetNode,
              targetElement: targetNode ? editor.toElement(targetNode) : null,
              targetGroup: targetNode ? editor.toGroup(targetNode) : null,
              selection: nextSelection,
              activeSelection,
              editor,
            },
          });
        };

        const onMouseDown = (event: MouseEvent) => {
          if (event.button !== 0) {
            return;
          }

          contextMenu.close();
        };

        scene.stage.container().addEventListener("contextmenu", onContextMenu);
        scene.stage.container().addEventListener("mousedown", onMouseDown);

        ctx.hooks.destroy.tap(() => {
          scene.stage.container().removeEventListener("contextmenu", onContextMenu);
          scene.stage.container().removeEventListener("mousedown", onMouseDown);
          contextMenu.close();
          menuMount?.dispose();
          menuMount = null;
        });
      });
    },
  };
}
