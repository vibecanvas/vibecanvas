import type {
  TInputHandlerResult,
  TInputManagerEventMap,
} from "../managers/input.manager";
import type Konva from "konva";

/**
 * Runtime context shared by all canvas systems.
 *
 * This is the canvas-level context, independent from the input manager.
 * Systems that only render or observe canvas state should depend on this type,
 * not on an input-specific abstraction.
 */
type TCanvasSystemRuntimeContext<TContext extends object> = {
  stage: Konva.Stage;
  data: TContext;
  getPointerPosition: () => Konva.Vector2d | null;
  requestDraw: () => void;
};

/**
 * Input-focused context for canvas systems.
 *
 * This extends the shared runtime context with the extra state and controls
 * needed only while routing user input.
 */
type TCanvasSystemInputContext<TContext extends object> = TCanvasSystemRuntimeContext<TContext> & {
  activeSystemName: string | null;
  setCursor: (cursor: string) => void;
  resetCursor: () => void;
};

/**
 * Base class for a canvas system.
 *
 * A system owns one coherent part of canvas behavior. Examples:
 * - camera / viewport state
 * - pen drawing
 * - marquee selection
 * - drag and drop
 * - resize handles
 * - grid rendering
 *
 * Intent:
 * - `CanvasService` owns the full runtime and composes systems together.
 * - each system owns its own internal state and behavior boundaries.
 * - input handling and drawing lifecycle are defined in one place so future
 *   systems follow the same shape.
 *
 * This class is intentionally descriptive first. It is meant to be reviewed
 * before refactoring existing systems to inherit from it.
 *
 * Design notes:
 * - `input` contains gesture and event hooks.
 * - `drawing` contains visual lifecycle hooks.
 * - `state` is owned by the system implementation and can store transient or
 *   persistent runtime data needed by that module.
 * - hooks are optional because not every system needs every capability.
 *   For example, a zoom system may only care about wheel input, while a grid
 *   system may only care about drawing updates.
 */
abstract class AbstractCanvasSystem<TContext extends object, TState> {
  /** Human-readable stable system id used by the canvas runtime. */
  abstract readonly name: string;

  /** Higher priority systems get first chance to claim input. */
  readonly priority: number;

  /** Internal runtime state owned by this system. */
  protected state: TState;

  /**
   * Input hooks for this system.
   *
   * These map directly to the input manager's routing model. A future refactor
   * can adapt these hooks into the manager without changing each concrete
   * system's public shape.
   */
  abstract readonly input: {
    isEnabled?: (context: TCanvasSystemInputContext<TContext>) => boolean;
    canStart?: (
      context: TCanvasSystemInputContext<TContext>,
      event: TInputManagerEventMap["pointerdown"],
    ) => boolean;
    onStart?: (
      context: TCanvasSystemInputContext<TContext>,
      event: TInputManagerEventMap["pointerdown"],
    ) => void;
    onMove?: (
      context: TCanvasSystemInputContext<TContext>,
      event: TInputManagerEventMap["pointermove"],
    ) => void;
    onEnd?: (
      context: TCanvasSystemInputContext<TContext>,
      event: TInputManagerEventMap["pointerup"],
    ) => void;
    onCancel?: (context: TCanvasSystemInputContext<TContext>) => void;
    onWheel?: (
      context: TCanvasSystemInputContext<TContext>,
      event: TInputManagerEventMap["wheel"],
    ) => TInputHandlerResult;
    onKeyDown?: (
      context: TCanvasSystemInputContext<TContext>,
      event: TInputManagerEventMap["keydown"],
    ) => TInputHandlerResult;
    onKeyUp?: (
      context: TCanvasSystemInputContext<TContext>,
      event: TInputManagerEventMap["keyup"],
    ) => TInputHandlerResult;
    getCursor?: (context: TCanvasSystemInputContext<TContext>) => string | null | undefined;
  };

  /**
   * Drawing hooks for this system.
   *
   * These are for visual ownership rather than input ownership. Examples:
   * - create/remove Konva nodes
   * - redraw overlays or guides
   * - react to camera/store changes
   * - batch drawing work on mount/update/unmount
   *
   * Drawing hooks intentionally use runtime context rather than input context.
   * Rendering a canvas module should not need to know about input-manager-owned
   * fields such as active gesture ownership or cursor controls.
   */
  abstract readonly drawing: {
    mount?: (context: TCanvasSystemRuntimeContext<TContext>) => void;
    redraw?: (context: TCanvasSystemRuntimeContext<TContext>) => void;
    unmount?: (context: TCanvasSystemRuntimeContext<TContext>) => void;
  };

  protected constructor(args: {
    priority?: number;
    state: TState;
  }) {
    this.priority = args.priority ?? 0;
    this.state = args.state;
  }

}

export { AbstractCanvasSystem };
export type { TCanvasSystemInputContext, TCanvasSystemRuntimeContext };
