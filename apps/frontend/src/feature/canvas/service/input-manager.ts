import Konva from "konva";

type TPointerEvent = Konva.KonvaEventObject<MouseEvent | TouchEvent | PointerEvent>;
type TWheelEvent = Konva.KonvaEventObject<WheelEvent>;
type TKeyboardEvent = KeyboardEvent;
type TInputHandlerResult = boolean | void;

/**
 * Normalized event names exposed by the input manager.
 *
 * Input systems never subscribe to Konva directly. Instead, the manager translates
 * stage and keyboard events into this small event map and forwards them to the
 * currently active system.
 */
type TInputManagerEventMap = {
  pointerdown: TPointerEvent;
  pointermove: TPointerEvent;
  pointerup: TPointerEvent;
  wheel: TWheelEvent;
  keydown: TKeyboardEvent;
  keyup: TKeyboardEvent;
};

/**
 * Runtime data passed into every input-system callback.
 *
 * `data` is the app-specific context you provide when creating the manager.
 * Keep long-lived canvas services, store accessors, selection helpers, and commit
 * functions there so systems can stay small and focused.
 */
type TInputManagerContext<TContext extends object> = {
  stage: Konva.Stage;
  data: TContext;
  activeSystemName: string | null;
  getPointerPosition: () => Konva.Vector2d | null;
  setCursor: (cursor: string) => void;
  resetCursor: () => void;
};

/**
 * A single gesture/input module managed by {@link InputManager}.
 *
 * Typical systems are: panning, marquee selection, dragging selected nodes,
 * resizing, or shape drawing.
 *
 * How the lifecycle works:
 * - `canStart()` decides whether this system should claim a pointer-down gesture.
 * - `onStart()` runs once when the system becomes active.
 * - `onMove()` receives pointer updates until the gesture ends.
 * - `onEnd()` commits final state and releases control.
 * - `onCancel()` cleans up transient UI when the gesture is interrupted.
 *
 * Priority is descending. Higher-priority systems get first chance to claim a
 * gesture, which makes it easy to let resize handles win over dragging, and
 * dragging win over marquee selection.
 *
 * Event fallthrough:
 * - `onWheel()`, `onKeyDown()`, and `onKeyUp()` may return `true` to signal
 *   that the event was handled and routing should stop.
 * - Return `false` or `undefined` to allow lower-priority systems to try.
 */
type TInputSystem<TContext extends object> = {
  name: string;
  priority?: number;
  isEnabled?: (context: TInputManagerContext<TContext>) => boolean;
  canStart?: (
    context: TInputManagerContext<TContext>,
    event: TInputManagerEventMap["pointerdown"],
  ) => boolean;
  onStart?: (
    context: TInputManagerContext<TContext>,
    event: TInputManagerEventMap["pointerdown"],
  ) => void;
  onMove?: (
    context: TInputManagerContext<TContext>,
    event: TInputManagerEventMap["pointermove"],
  ) => void;
  onEnd?: (
    context: TInputManagerContext<TContext>,
    event: TInputManagerEventMap["pointerup"],
  ) => void;
  onCancel?: (context: TInputManagerContext<TContext>) => void;
  onWheel?: (
    context: TInputManagerContext<TContext>,
    event: TInputManagerEventMap["wheel"],
  ) => TInputHandlerResult;
  onKeyDown?: (
    context: TInputManagerContext<TContext>,
    event: TInputManagerEventMap["keydown"],
  ) => TInputHandlerResult;
  onKeyUp?: (
    context: TInputManagerContext<TContext>,
    event: TInputManagerEventMap["keyup"],
  ) => TInputHandlerResult;
  getCursor?: (context: TInputManagerContext<TContext>) => string | null | undefined;
};

/**
 * Construction options for {@link InputManager}.
 *
 * `context` is intentionally generic so the manager can be reused by different
 * canvas runtimes without depending on a specific store or document format.
 */
type TInputManagerOptions<TContext extends object> = {
  stage: Konva.Stage;
  context: TContext;
  defaultCursor?: string;
  keyboardTarget?: Window | Document | HTMLElement;
};

export type {
  TInputManagerContext,
  TInputManagerEventMap,
  TInputSystem,
  TInputManagerOptions,
};

/**
 * Coordinates all canvas input systems for a single Konva stage.
 *
 * Why this exists:
 * - Konva gives you raw events, but complex canvases quickly end up with many
 *   competing interactions: pan, select, drag, resize, draw, text edit, etc.
 * - This manager keeps one active gesture owner at a time, so each interaction
 *   system stays isolated and conflict-free.
 *
 * Recommended usage:
 * ```ts
 * const inputManager = new InputManager({
 *   stage,
 *   context: {
 *     getActiveTool: () => store.activeTool,
 *     overlayLayer,
 *     commitMove,
 *   },
 * });
 *
 * inputManager.registerSystem(selectBoxSystem);
 * inputManager.registerSystem(dragSelectionSystem);
 * inputManager.registerSystem(panSystem);
 * ```
 *
 * Recommended system priority:
 * - resize handles
 * - drag selected nodes
 * - marquee selection
 * - panning
 * - drawing tools
 *
 * Usage rules:
 * - Keep transient gesture state inside each input system.
 * - Use `context.data` to access app services and callbacks.
 * - Update Konva preview nodes during `onMove()`.
 * - Commit to Automerge/store in `onEnd()`, not on every pointer move.
 * - Call `destroy()` when the canvas is unmounted.
 */
export class InputManager<TContext extends object> {
  #stage: Konva.Stage;
  #context: TContext;
  #keyboardTarget: Window | Document | HTMLElement;
  #defaultCursor: string;
  #systems: TInputSystem<TContext>[] = [];
  #activeSystem: TInputSystem<TContext> | null = null;

  readonly #handlePointerDown = (event: TPointerEvent) => {
    if (this.#activeSystem) return;

    const runtime = this.#runtimeContext();

    for (const system of this.#systems) {
      if (!this.#isSystemEnabled(system, runtime)) continue;
      if (system.canStart && !system.canStart(runtime, event)) continue;

      this.#activeSystem = system;
      system.onStart?.(this.#runtimeContext(), event);
      this.#syncCursor();
      return;
    }
  };

  readonly #handlePointerMove = (event: TPointerEvent) => {
    if (!this.#activeSystem) return;

    this.#activeSystem.onMove?.(this.#runtimeContext(), event);
    this.#syncCursor();
  };

  readonly #handlePointerUp = (event: TPointerEvent) => {
    if (!this.#activeSystem) return;

    const activeSystem = this.#activeSystem;
    activeSystem.onEnd?.(this.#runtimeContext(), event);
    this.#activeSystem = null;
    this.#syncCursor();
  };

  readonly #handleCancel = () => {
    if (!this.#activeSystem) return;

    const activeSystem = this.#activeSystem;
    activeSystem.onCancel?.(this.#runtimeContext());
    this.#activeSystem = null;
    this.#syncCursor();
  };

  readonly #handleWheel = (event: TWheelEvent) => {
    const runtime = this.#runtimeContext();

    if (this.#activeSystem?.onWheel) {
      const handled = this.#activeSystem.onWheel(runtime, event);
      if (handled) return;
    }

    for (const system of this.#systems) {
      if (!this.#isSystemEnabled(system, runtime)) continue;
      if (!system.onWheel) continue;

      const handled = system.onWheel(runtime, event);
      if (handled) return;
    }
  };

  readonly #handleKeyDown = (event: TKeyboardEvent) => {
    const runtime = this.#runtimeContext();

    if (this.#activeSystem?.onKeyDown) {
      const handled = this.#activeSystem.onKeyDown(runtime, event);
      this.#syncCursor();
      if (handled) return;
    }

    for (const system of this.#systems) {
      if (!this.#isSystemEnabled(system, runtime)) continue;
      if (!system.onKeyDown) continue;

      const handled = system.onKeyDown(runtime, event);
      this.#syncCursor();
      if (handled) return;
    }
  };

  readonly #handleKeyDownEvent: EventListener = (event) => {
    if (!(event instanceof KeyboardEvent)) return;
    this.#handleKeyDown(event);
  };

  readonly #handleKeyUp = (event: TKeyboardEvent) => {
    const runtime = this.#runtimeContext();

    if (this.#activeSystem?.onKeyUp) {
      const handled = this.#activeSystem.onKeyUp(runtime, event);
      this.#syncCursor();
      if (handled) return;
    }

    for (const system of this.#systems) {
      if (!this.#isSystemEnabled(system, runtime)) continue;
      if (!system.onKeyUp) continue;

      const handled = system.onKeyUp(runtime, event);
      this.#syncCursor();
      if (handled) return;
    }
  };

  readonly #handleKeyUpEvent: EventListener = (event) => {
    if (!(event instanceof KeyboardEvent)) return;
    this.#handleKeyUp(event);
  };

  constructor(options: TInputManagerOptions<TContext>) {
    this.#stage = options.stage;
    this.#context = options.context;
    this.#defaultCursor = options.defaultCursor ?? "default";
    this.#keyboardTarget = options.keyboardTarget ?? window;

    this.#bind();
    this.#syncCursor();
  }

  /** The currently active system name, or `null` when idle. */
  get activeSystemName() {
    return this.#activeSystem?.name ?? null;
  }

  /**
   * Registers a new input system.
   *
   * If another system with the same name already exists, it is replaced.
   * Systems are always re-sorted by priority after registration.
   */
  registerSystem(system: TInputSystem<TContext>) {
    this.unregisterSystem(system.name);
    this.#systems.push(system);
    this.#sortSystems();
    this.#syncCursor();
  }

  /**
   * Removes an input system by name.
   *
   * If the removed system currently owns the active gesture, it is cancelled
   * first so temporary overlays or drag state can be cleaned up safely.
   */
  unregisterSystem(name: string) {
    const activeName = this.#activeSystem?.name;
    this.#systems = this.#systems.filter((system) => system.name !== name);

    if (activeName === name) {
      this.#handleCancel();
    }

    this.#syncCursor();
  }

  /** Replaces the shared runtime context passed to all input systems. */
  setContext(context: TContext) {
    this.#context = context;
    this.#syncCursor();
  }

  /**
   * Merges a partial update into the shared runtime context.
   *
   * This is useful when the active tool, selection set, or service callbacks
   * change over time but you want to keep the same manager instance alive.
   */
  patchContext(patch: Partial<TContext>) {
    this.#context = {
      ...this.#context,
      ...patch,
    };

    this.#syncCursor();
  }

  /** Cancels the active system, if any, and returns the manager to idle state. */
  cancelActiveSystem() {
    this.#handleCancel();
  }

  /**
   * Detaches all Konva and keyboard listeners.
   *
   * Call this from your component cleanup to avoid orphaned event handlers.
   */
  destroy() {
    this.#handleCancel();
    this.#unbind();
    this.#resetCursor();
  }

  #bind() {
    this.#stage.on("mousedown touchstart", this.#handlePointerDown);
    this.#stage.on("mousemove touchmove", this.#handlePointerMove);
    this.#stage.on("mouseup touchend", this.#handlePointerUp);
    this.#stage.on("mouseleave touchcancel", this.#handleCancel);
    this.#stage.on("wheel", this.#handleWheel);

    this.#keyboardTarget.addEventListener("keydown", this.#handleKeyDownEvent);
    this.#keyboardTarget.addEventListener("keyup", this.#handleKeyUpEvent);
  }

  #unbind() {
    this.#stage.off("mousedown touchstart", this.#handlePointerDown);
    this.#stage.off("mousemove touchmove", this.#handlePointerMove);
    this.#stage.off("mouseup touchend", this.#handlePointerUp);
    this.#stage.off("mouseleave touchcancel", this.#handleCancel);
    this.#stage.off("wheel", this.#handleWheel);

    this.#keyboardTarget.removeEventListener("keydown", this.#handleKeyDownEvent);
    this.#keyboardTarget.removeEventListener("keyup", this.#handleKeyUpEvent);
  }

  #sortSystems() {
    this.#systems.sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));
  }

  #runtimeContext(): TInputManagerContext<TContext> {
    return {
      stage: this.#stage,
      data: this.#context,
      activeSystemName: this.#activeSystem?.name ?? null,
      getPointerPosition: () => this.#stage.getPointerPosition(),
      setCursor: (cursor: string) => {
        this.#stage.container().style.cursor = cursor;
      },
      resetCursor: () => {
        this.#resetCursor();
      },
    };
  }

  #isSystemEnabled(system: TInputSystem<TContext>, context: TInputManagerContext<TContext>) {
    return system.isEnabled ? system.isEnabled(context) : true;
  }

  #syncCursor() {
    const runtime = this.#runtimeContext();
    const cursor = this.#activeSystem?.getCursor?.(runtime);

    if (cursor) {
      runtime.setCursor(cursor);
      return;
    }

    this.#resetCursor();
  }

  #resetCursor() {
    this.#stage.container().style.cursor = this.#defaultCursor;
  }
}
