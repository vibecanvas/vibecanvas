import Konva from "konva";
import { createComponent, createSignal, type Accessor, type Setter } from "solid-js";
import { render } from "solid-js/web";
import { CanvasContextMenu, type TCanvasContextMenuItem } from "../../components/CanvasContextMenu";
import type { IPlugin, IPluginContext } from "../shared/interface";
import { GroupPlugin } from "../Group/Group.plugin";
import { TransformPlugin } from "../Transform/Transform.plugin";

type TMenuKind = "canvas" | "item" | "selection";

function getSelectionPath(
  context: IPluginContext,
  node: Konva.Group | Konva.Shape,
): Array<Konva.Group | Konva.Shape> {
  const path: Array<Konva.Group | Konva.Shape> = [];
  let current: Konva.Node | null = node;

  while (current && current !== context.staticForegroundLayer) {
    if (current instanceof Konva.Group || current instanceof Konva.Shape) {
      path.push(current);
    }

    current = current.parent;
  }

  return path.reverse();
}

export class ContextMenuPlugin implements IPlugin {
  #mountElement: HTMLDivElement | null = null;
  #disposeRender: (() => void) | null = null;
  #mounted: Accessor<boolean>;
  #setMounted: Setter<boolean>;
  #x: Accessor<number>;
  #setX: Setter<number>;
  #y: Accessor<number>;
  #setY: Setter<number>;
  #items: Accessor<TCanvasContextMenuItem[]>;
  #setItems: Setter<TCanvasContextMenuItem[]>;
  #openRequestId: Accessor<number>;
  #setOpenRequestId: Setter<number>;

  constructor() {
    const [mounted, setMounted] = createSignal(false);
    const [x, setX] = createSignal(0);
    const [y, setY] = createSignal(0);
    const [items, setItems] = createSignal<TCanvasContextMenuItem[]>([]);
    const [openRequestId, setOpenRequestId] = createSignal(0);
    this.#mounted = mounted;
    this.#setMounted = setMounted;
    this.#x = x;
    this.#setX = setX;
    this.#y = y;
    this.#setY = setY;
    this.#items = items;
    this.#setItems = setItems;
    this.#openRequestId = openRequestId;
    this.#setOpenRequestId = setOpenRequestId;
  }

  apply(context: IPluginContext): void {
    context.hooks.init.tap(() => {
      this.mount(context);
      const onContextMenu = (event: MouseEvent) => {
        const target = event.target as Node | null;
        if (target && this.#mountElement?.contains(target)) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.openFromEvent(context, event);
      };
      const onMouseDown = (event: MouseEvent) => {
        if (event.button !== 0) return;
        this.close();
      };

      context.stage.container().addEventListener("contextmenu", onContextMenu);
      context.stage.container().addEventListener("mousedown", onMouseDown);
      context.hooks.destroy.tap(() => {
        context.stage.container().removeEventListener("contextmenu", onContextMenu);
        context.stage.container().removeEventListener("mousedown", onMouseDown);
        this.close();
        this.#disposeRender?.();
        this.#mountElement?.remove();
        this.#mountElement = null;
        this.#disposeRender = null;
      });
    });
  }

  private mount(context: IPluginContext) {
    const mountElement = document.createElement("div");
    mountElement.className = "absolute inset-0 pointer-events-none";

    this.#disposeRender = render(() => createComponent(CanvasContextMenu, {
      mounted: this.#mounted,
      x: this.#x,
      y: this.#y,
      items: this.#items,
      openRequestId: this.#openRequestId,
      onOpenChange: (open) => {
        if (open) return;
        this.close();
      },
    }), mountElement);

    context.stage.container().appendChild(mountElement);
    this.#mountElement = mountElement;
  }

  private openFromEvent(context: IPluginContext, event: MouseEvent) {
    context.stage.setPointersPositions(event);
    const pointer = context.stage.getPointerPosition();
    const target = pointer ? this.findTargetNode(context, pointer) : null;
    const targetNode = target instanceof Konva.Group || target instanceof Konva.Shape ? target : null;

    let selection = context.state.selection;
    let kind: TMenuKind = "canvas";

    if (targetNode) {
      selection = this.resolveSelection(context, targetNode);
      context.setState("selection", selection);
      kind = selection.length > 1 ? "selection" : "item";
    }

    this.open(context, {
      x: event.clientX,
      y: event.clientY,
      kind,
      selection,
    });
  }

  private findTargetNode(context: IPluginContext, pointer: { x: number; y: number }) {
    const directHit = context.stage.getIntersection(pointer);
    if (directHit) return directHit;

    const candidates = context.staticForegroundLayer.find((node: Konva.Node) => {
      return (node instanceof Konva.Group || node instanceof Konva.Shape) && node.isListening();
    }) as Array<Konva.Group | Konva.Shape>;

    return [...candidates].reverse().find((node) => {
      const box = node.getClientRect();
      return Konva.Util.haveIntersection(box, {
        x: pointer.x,
        y: pointer.y,
        width: 1,
        height: 1,
      });
    }) ?? null;
  }

  private resolveSelection(context: IPluginContext, target: Konva.Group | Konva.Shape) {
    const activeSelection = TransformPlugin.filterSelection(context.state.selection);
    if (activeSelection.includes(target)) {
      return context.state.selection;
    }

    const path = getSelectionPath(context, target);
    const nextDepth = Math.min(Math.max(context.state.selection.length, 1), path.length);
    return path.slice(0, nextDepth);
  }

  private open(context: IPluginContext, args: {
    x: number;
    y: number;
    kind: TMenuKind;
    selection: Array<Konva.Group | Konva.Shape>;
  }) {
    if (!this.#mountElement) return;

    const activeSelection = TransformPlugin.filterSelection(args.selection);
    const sameParent = activeSelection.length <= 1
      || activeSelection.every((node) => node.getParent() === activeSelection[0]?.getParent());

    const items: TCanvasContextMenuItem[] = [];

    const addItem = (label: string, onClick: () => void, disabled = false) => {
      items.push({
        id: `${label}-${items.length}`,
        label,
        disabled,
        onSelect: () => {
          if (disabled) return;
          onClick();
          this.close();
        },
      });
    };

    if (args.kind === "canvas") {
      addItem("No actions available", () => {}, true);
    } else {
      addItem("Bring to front", () => context.capabilities.renderOrder?.bringSelectionToFront(activeSelection), !sameParent || activeSelection.length === 0);
      addItem("Move forward", () => context.capabilities.renderOrder?.moveSelectionUp(activeSelection), !sameParent || activeSelection.length === 0);
      addItem("Move backward", () => context.capabilities.renderOrder?.moveSelectionDown(activeSelection), !sameParent || activeSelection.length === 0);
      addItem("Send to back", () => context.capabilities.renderOrder?.sendSelectionToBack(activeSelection), !sameParent || activeSelection.length === 0);

      if (activeSelection.length > 1) {
        addItem("Group", () => {
          const group = GroupPlugin.group(context, activeSelection);
          context.setState("selection", [group]);
        });
      }

      if (activeSelection.some((node) => node instanceof Konva.Group)) {
        addItem("Ungroup", () => {
          const group = [...activeSelection].reverse().find((node): node is Konva.Group => node instanceof Konva.Group);
          if (!group) return;
          const children = GroupPlugin.ungroup(context, group);
          context.setState("selection", children);
        });
      }
    }

    this.#setItems(items);

    this.#setX(args.x);
    this.#setY(args.y);
    this.#setMounted(true);
    this.#setOpenRequestId((value) => value + 1);

  }

  private close() {
    this.#setMounted(false);
    this.#setItems([]);
  }
}
