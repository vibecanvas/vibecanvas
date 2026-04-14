import type { IService } from "@vibecanvas/runtime";
import { SyncHook } from "@vibecanvas/tapable";
import { CanvasMode } from "./CONSTANTS";
import type { Group } from "konva/lib/Group";
import type { Shape, ShapeConfig } from "konva/lib/Shape";

export interface TSelectionServiceHooks {
  change: SyncHook<[]>;
}

/**
 * Holds selection and tool state.
 * Owns mode, active selection, and focused node id.
 */
export class SelectionService implements IService<TSelectionServiceHooks> {
  readonly name = "selection";
  readonly hooks: TSelectionServiceHooks = {
    change: new SyncHook(),
  };

  mode = CanvasMode.SELECT;
  selection: Array<Group | Shape<ShapeConfig>> = [];
  focusedId: string | null = null;
  private suppressSelectionHandlingUntil = 0;

  setMode(mode: CanvasMode) {
    if (this.mode === mode) {
      return;
    }

    this.mode = mode;
    this.hooks.change.call();
  }

  setSelection(selection: Array<Group | Shape<ShapeConfig>>) {
    this.selection = selection;
    this.hooks.change.call();
  }

  setFocusedId(focusedId: string | null) {
    this.focusedId = focusedId;
    this.hooks.change.call();
  }

  setFocusedNode(node: Group | Shape<ShapeConfig> | null) {
    this.setFocusedId(node?.id() ?? null);
  }

  suppressSelectionHandling(durationMs: number) {
    const now = Date.now();
    this.suppressSelectionHandlingUntil = Math.max(this.suppressSelectionHandlingUntil, now + durationMs);
  }

  isSelectionHandlingSuppressed() {
    return Date.now() < this.suppressSelectionHandlingUntil;
  }

  clear() {
    this.selection = [];
    this.focusedId = null;
    this.hooks.change.call();
  }
}
