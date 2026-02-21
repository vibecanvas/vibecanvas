import { cmdResize, cmdRotate } from "@/features/canvas-crdt/input-commands";
import { cmdDragClone } from "@/features/canvas-crdt/input-commands/cmd.drag-clone";
import type { Canvas } from "@/features/canvas-crdt/canvas/canvas";
import { applyChangesToCRDT } from "@/features/canvas-crdt/changes";
import { Graphics, Point, Rectangle } from "pixi.js";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { cmdDragSelection } from "../../../input-commands/cmd.drag-selection";
import { cmdSelectOnClick } from "../../../input-commands/cmd.select-on-click";
import { type TAction, type TActionType, type TChanges } from "../../../types";
import { AElement, type TBackendElementOf } from "../../element.abstract";
import { computeRotatedAABB } from "../../math.util";
import { TransformBox } from "../../transform-box/transform-box";
import type { TDimensions, TResizeContext } from "../../transformable.interface";
import { applyClone } from "../rect/rect.apply-clone";
import { clampSize, clampX, clampY, type TApplyContextWH } from "../rect/rect.apply-context";
import { applyDeselect } from "../rect/rect.apply-deselect";
import { applyMove } from "../rect/rect.apply-move";
import { applySetPosition } from "../rect/rect.apply-position";
import { applyResize } from "../rect/rect.apply-resize";
import { applyRotate } from "../rect/rect.apply-rotate";
import { applyScale } from "../rect/rect.apply-scale";
import { applySelect } from "../rect/rect.apply-select";
import { applySetStyle } from "../rect/rect.apply-style";
import { calculateRotatedResize } from "../rect/rect.math";
import { applyDelete } from "./filetree.apply-delete";

const commands = [cmdSelectOnClick, cmdDragClone, cmdDragSelection];

type TFiletreeBounds = {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  scale: number;
};

const FILETREE_SUPPORTED_ACTIONS: ReadonlySet<TActionType> = new Set([
  "setPosition",
  "move",
  "rotate",
  "scale",
  "resize",
  "clone",
  "delete",
  "select",
  "deselect",
  "setStyle",
] as const);

export class FiletreeElement extends AElement<"filetree"> {
  private graphics: Graphics = new Graphics();
  private overlayDiv: HTMLDivElement | null = null;
  private setBounds: ((bounds: TFiletreeBounds) => void) | null = null;
  private tickerCallback: (() => void) | null = null;

  constructor(element: TBackendElementOf<"filetree">, canvas: Canvas) {
    super(element, canvas);
    this.container.addChild(this.graphics);
    this.container.label = "filetree-drawing-renderable-container";
    this.redraw();

    this.transformBox = new TransformBox(this, canvas, {
      cornerCommands: [cmdResize],
      edgeCommands: [cmdResize],
      rotationCommands: [cmdRotate],
    });
    this.container.addChild(this.transformBox.container);
    this.setupPointerListeners("filetree", commands);

    void this.renderFiletreeComponent();
    this.setupViewportSync();
  }

  private async renderFiletreeComponent() {
    if (typeof document === "undefined") return;

    const div = document.createElement("div");
    div.id = `Filetree:${this.element.id}`;
    this.overlayDiv = div;

    const overlayEntrypoint = document.querySelector("#canvas-overlay-entrypoint");
    if (!overlayEntrypoint) return;
    overlayEntrypoint.appendChild(div);

    const [bounds, setBounds] = createSignal<TFiletreeBounds>(this.getScreenBounds());
    this.setBounds = setBounds;

    let lastDragMovement: TChanges | null = null;
    const storeModule = await import("@/store");
    const canvasActive = storeModule.store.canvasSlice.backendCanvasActive;
    if (!canvasActive) throw new Error("No active canvas");

    const filetreeModule = await import("@/features/filetree/components/filetree");
    const Filetree = filetreeModule.Filetree;

    render(() => Filetree({
      bounds,
      filetreeClass: this,
      canvasId: canvasActive.id,
      filetreeId: this.element.id,
      onSelect: () => applySelect(this.getApplyContext()),
      onDrag: ({ x, y }) => {
        lastDragMovement = applyMove(this.getApplyContext(), { delta: new Point(x, y), type: "move" });
      },
      onDragEnd: () => {
        if (lastDragMovement) {
          applyChangesToCRDT(this.canvas.handle, [lastDragMovement]);
          lastDragMovement = null;
        }
      },
      onDragStart: () => {
      },
    }), div);

    this.container.on("destroyed", () => {
      this.cleanupOverlay();
    });
  }

  private setupViewportSync() {
    this.tickerCallback = () => {
      this.updateOverlayBounds();
    };
    this.canvas.app.ticker.add(this.tickerCallback);
  }

  private getScreenBounds(): TFiletreeBounds {
    const { w, h } = this.element.data;
    const scale = this.canvas.app.stage.scale.x;
    const center = this.canvas.app.stage.toGlobal({ x: this.container.x, y: this.container.y });

    return {
      x: center.x,
      y: center.y,
      w,
      h,
      angle: this.element.angle,
      scale,
    };
  }

  private updateOverlayBounds() {
    if (this.setBounds) this.setBounds(this.getScreenBounds());
  }

  private cleanupOverlay() {
    if (this.tickerCallback) {
      this.canvas.app.ticker.remove(this.tickerCallback);
      this.tickerCallback = null;
    }
    if (this.overlayDiv) {
      this.overlayDiv.remove();
      this.overlayDiv = null;
    }
  }

  public get supportedActions(): ReadonlySet<TActionType> {
    return FILETREE_SUPPORTED_ACTIONS;
  }

  public canApply(action: TAction): boolean {
    return this.supportedActions.has(action.type as TActionType);
  }

  private getApplyContext(): TApplyContextWH {
    return {
      element: this.element,
      id: this.id,
      container: this.container,
      transformBox: this.transformBox,
      canvas: this.canvas,
      redraw: () => this.redraw(),
      localBounds: this.localBounds,
      isSelected: this._isSelected,
      setIsSelected: (value: boolean) => { this.isSelected = value; },
      setResize: (ctx: TResizeContext) => this.setResize(ctx),
    };
  }

  public dispatch(action: TAction): TChanges | null {
    if (!this.canApply(action)) return null;

    const ctx = this.getApplyContext();

    switch (action.type) {
      case "setPosition":
        return applySetPosition(ctx, action);
      case "move":
        return applyMove(ctx, action);
      case "rotate":
        return applyRotate(ctx, action);
      case "scale":
        return applyScale(ctx, action);
      case "resize":
        return applyResize(ctx, action);
      case "select":
        return applySelect(ctx);
      case "deselect":
        return applyDeselect(ctx);
      case "setStyle":
        return applySetStyle(ctx, action);
      case "clone":
        return applyClone(ctx, action);
      case "delete":
        return applyDelete(ctx);
      default:
        return null;
    }
  }

  public get dimensions(): TDimensions {
    return { w: this.container.width, h: this.container.height };
  }

  public set dimensions(dim: TDimensions) {
    const w = clampSize(dim.w);
    const h = clampSize(dim.h);
    this.container.width = w;
    this.container.height = h;
    this.element.data.w = w;
    this.element.data.h = h;
    this.redraw();
  }

  public getWorldBounds(): Rectangle {
    const local = this.container.getLocalBounds();
    return computeRotatedAABB(
      this.container.x,
      this.container.y,
      local.width,
      local.height,
      this.container.rotation
    );
  }

  public setResize(ctx: TResizeContext): void {
    const bounds = calculateRotatedResize(ctx, this.container.rotation);

    this.element.x = clampX(bounds.x);
    this.element.y = clampY(bounds.y);
    this.element.data.w = clampSize(bounds.w);
    this.element.data.h = clampSize(bounds.h);
    this.redraw();
    this.transformBox?.redraw();
  }

  public redraw(): void {
    const { w, h } = this.element.data;
    const { opacity } = this.element.style;

    this.container.alpha = opacity ?? 1;
    this.container.pivot.set(w / 2, h / 2);
    this.container.position.set(this.element.x + w / 2, this.element.y + h / 2);
    this.container.boundsArea = new Rectangle(0, 0, w, h);
  }

  static isFiletreeElement(instance: AElement): instance is FiletreeElement {
    return instance instanceof FiletreeElement;
  }
}
