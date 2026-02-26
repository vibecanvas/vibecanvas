import type { Canvas } from "@/features/canvas-crdt/canvas/canvas";
import { applyChangesToCRDT } from "@/features/canvas-crdt/changes";
import { cmdResize, cmdRotate } from "@/features/canvas-crdt/input-commands";
import { cmdDragClone } from "@/features/canvas-crdt/input-commands/cmd.drag-clone";
import { Graphics, Point, Rectangle } from "pixi.js";
import { createComponent, createSignal } from "solid-js";
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
import { applyDelete } from "./terminal.apply-delete";

const commands = [cmdSelectOnClick, cmdDragClone, cmdDragSelection];

type TTerminalBounds = {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  scale: number;
};

const BOUNDS_EPSILON = 0.01;

function hasBoundsChanged(next: TTerminalBounds, prev: TTerminalBounds | null): boolean {
  if (!prev) return true;
  return (
    Math.abs(next.x - prev.x) > BOUNDS_EPSILON
    || Math.abs(next.y - prev.y) > BOUNDS_EPSILON
    || Math.abs(next.w - prev.w) > BOUNDS_EPSILON
    || Math.abs(next.h - prev.h) > BOUNDS_EPSILON
    || Math.abs(next.angle - prev.angle) > BOUNDS_EPSILON
    || Math.abs(next.scale - prev.scale) > BOUNDS_EPSILON
  );
}

const TERMINAL_SUPPORTED_ACTIONS: ReadonlySet<TActionType> = new Set([
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

export class TerminalElement extends AElement<"terminal"> {
  private graphics: Graphics = new Graphics();
  private overlayDiv: HTMLDivElement | null = null;
  private setBounds: ((bounds: TTerminalBounds) => void) | null = null;
  private cleanupViewportSync: (() => void) | null = null;
  private lastBounds: TTerminalBounds | null = null;

  constructor(element: TBackendElementOf<"terminal">, canvas: Canvas) {
    super(element, canvas);
    this.container.addChild(this.graphics);
    this.container.label = "terminal-drawing-renderable-container";
    this.redraw();

    this.transformBox = new TransformBox(this, canvas, {
      cornerCommands: [cmdResize],
      edgeCommands: [cmdResize],
      rotationCommands: [cmdRotate],
    });
    this.container.addChild(this.transformBox.container);
    this.setupPointerListeners("terminal", commands);

    void this.renderTerminalComponent();
    this.setupViewportSync();
  }

  private async renderTerminalComponent() {
    if (typeof document === "undefined") return;

    const div = document.createElement("div");
    div.id = `Terminal:${this.element.id}`;
    this.overlayDiv = div;

    const overlayEntrypoint = document.querySelector("#canvas-overlay-entrypoint");
    if (!overlayEntrypoint) return;
    overlayEntrypoint.appendChild(div);

    const initialBounds = this.getScreenBounds();
    const [bounds, setBounds] = createSignal<TTerminalBounds>(initialBounds);
    this.setBounds = setBounds;
    this.lastBounds = initialBounds;

    let lastDragMovement: TChanges | null = null;

    const updateDrag = (delta: { x: number; y: number }) => {
      const result = this.dispatch({ type: "move", delta: new Point(delta.x, delta.y) });
      if (result) lastDragMovement = result;
      this.updateOverlayBounds(true);
    };

    this.handlePointerDown = (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.dragState.isDragging = true;
      this.dragState.lastPos = { x: event.clientX, y: event.clientY };
      applySelect(this.getApplyContext());
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    };

    this.handlePointerMove = (event) => {
      if (!this.dragState.isDragging) return;
      event.preventDefault();
      const scale = this.getScreenBounds().scale;
      const dx = (event.clientX - this.dragState.lastPos.x) / scale;
      const dy = (event.clientY - this.dragState.lastPos.y) / scale;
      this.dragState.lastPos = { x: event.clientX, y: event.clientY };
      updateDrag({ x: dx, y: dy });
    };

    this.handlePointerUp = (event) => {
      if (!this.dragState.isDragging) return;
      this.dragState.isDragging = false;
      if (lastDragMovement) {
        applyChangesToCRDT(this.canvas.handle, [lastDragMovement]);
        lastDragMovement = null;
      }
      (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    };

    const terminalModule = await import("@/features/terminal/components/terminal-widget");
    const TerminalWidget = terminalModule.TerminalWidget;

    render(() => createComponent(TerminalWidget, {
      title: "Terminal",
      terminalKey: this.element.id,
      workingDirectory: this.element.data.workingDirectory,
      bounds,
      onPointerDown: this.handlePointerDown,
      onPointerMove: this.handlePointerMove,
      onPointerUp: this.handlePointerUp,
      onRemove: () => {
        const changes = this.dispatch({ type: "delete" });
        if (changes) applyChangesToCRDT(this.canvas.handle, [changes]);
      },
    }), div);

    this.container.on("destroyed", () => {
      this.cleanupOverlay();
    });
  }

  private dragState = {
    isDragging: false,
    lastPos: { x: 0, y: 0 },
  };

  private handlePointerDown: (event: PointerEvent) => void = () => {};
  private handlePointerMove: (event: PointerEvent) => void = () => {};
  private handlePointerUp: (event: PointerEvent) => void = () => {};

  private setupViewportSync() {
    this.cleanupViewportSync = this.canvas.onViewportChange(() => {
      this.updateOverlayBounds();
    });
  }

  private getScreenBounds(): TTerminalBounds {
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

  private updateOverlayBounds(force = false) {
    if (!this.setBounds) return;

    const nextBounds = this.getScreenBounds();
    if (!force && !hasBoundsChanged(nextBounds, this.lastBounds)) return;

    this.lastBounds = nextBounds;
    this.setBounds(nextBounds);
  }

  private cleanupOverlay() {
    if (this.cleanupViewportSync) {
      this.cleanupViewportSync();
      this.cleanupViewportSync = null;
    }
    if (this.overlayDiv) {
      this.overlayDiv.remove();
      this.overlayDiv = null;
    }
    this.lastBounds = null;
  }

  public get supportedActions(): ReadonlySet<TActionType> {
    return TERMINAL_SUPPORTED_ACTIONS;
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
      this.container.rotation,
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

    this.graphics.clear();
    this.graphics.fill({ color: 0x0f1115, alpha: 0.02 });
    this.graphics.stroke({ color: 0x2d3748, width: 1, alpha: 0.2 });
    this.graphics.rect(0, 0, w, h);
    this.graphics.fill();
    this.graphics.stroke();

    this.container.alpha = opacity ?? 1;
    this.container.pivot.set(w / 2, h / 2);
    this.container.position.set(this.element.x + w / 2, this.element.y + h / 2);
    this.container.boundsArea = new Rectangle(0, 0, w, h);
    this.updateOverlayBounds();
  }

  static isTerminalElement(instance: AElement): instance is TerminalElement {
    return instance instanceof TerminalElement;
  }
}
