import type Konva from "konva";
import type { SyncHook } from "@vibecanvas/tapable";
import type { KonvaEventObject, Node, NodeConfig } from "konva/lib/Node";

/**
 * Runtime mode for a registered editor tool.
 * Used to map tool choice into broad editor behavior.
 */
export type TEditorToolMode = "select" | "hand" | "draw-create" | "click-create";

/**
 * Keyboard shortcut description for a tool.
 * Examples: `5`, `r`, `ctrl+b`.
 */
export type TEditorToolShortcut = string;
export type TEditorToolIcon = string;
export type TEditorToolPointerEvent = KonvaEventObject<PointerEvent, Node<NodeConfig>>;
export type TEditorToolCanvasPoint = {
  x: number;
  y: number;
  pressure: number;
};

export type TEditorToolDrawCreateStartDraftArgs = {
  event: TEditorToolPointerEvent;
  point: TEditorToolCanvasPoint;
};

export type TEditorToolDrawCreateUpdateDraftArgs = {
  draft: unknown;
  event: TEditorToolPointerEvent;
  point: TEditorToolCanvasPoint;
  origin: TEditorToolCanvasPoint;
  shiftKey: boolean;
  now: number;
};

export type TEditorToolDrawCreateBehavior = {
  startDraft: (args: TEditorToolDrawCreateStartDraftArgs) => Konva.Shape;
  updateDraft: (previewNode: Konva.Shape, args: TEditorToolDrawCreateUpdateDraftArgs) => unknown;
};

/**
 * Tool metadata registered by feature plugins.
 * Toolbar should render from this registry instead of hardcoded tool lists.
 */
export type TEditorTool = {
  id: string;
  label: string;
  icon?: TEditorToolIcon;
  shortcuts?: TEditorToolShortcut[];
  group?: string; // planned for dropdown
  priority?: number;
  active?: boolean;
  onSelect?: () => void;
  behavior:
    | { type: "mode"; mode: TEditorToolMode }
    | { type: "action" }
    | { type: "modal" };
  drawCreate?: TEditorToolDrawCreateBehavior;
};

/**
 * Editor-local hook bag.
 * Used for tool registry and editing state changes.
 */
export interface TEditorServiceHooks {
  toolsChange: SyncHook<[]>;
  activeToolChange: SyncHook<[string]>;
  editingTextChange: SyncHook<[string | null]>;
  editingShape1dChange: SyncHook<[string | null]>;
}
