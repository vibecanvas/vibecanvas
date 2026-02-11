import { type FederatedPointerEvent, Point } from "pixi.js"
import type { InputCommand, InputContext, KeyboardEventType, KeyboardInputContext, PointerEventType, PointerInputContext, TCommandTarget, WheelEventType, WheelInputContext } from "./types"
import type { Canvas } from "../canvas/canvas"

export function runCommands(commands: InputCommand[], ctx: InputContext): boolean {
  for (const cmd of commands) {
    const handled = cmd(ctx)

    // Immediate bubble: break out, let caller handle
    if (ctx._bubbleRequested) {
      return false  // Signal: not handled by this chain
    }

    if (handled) {
      return true   // Handled, stop chain
    }
  }
  return false // not handled
}

export function getModifiers(event: FederatedPointerEvent | WheelEvent | KeyboardEvent) {
  return {
    shift: 'shiftKey' in event ? event.shiftKey : false,
    ctrl: 'ctrlKey' in event ? event.ctrlKey : false,
    meta: 'metaKey' in event ? event.metaKey : false,
    alt: 'altKey' in event ? event.altKey : false,
  }
}

export function buildPointerContext(
  canvas: Canvas,
  commandTarget: TCommandTarget,
  e: FederatedPointerEvent,
  listenerId: string
): PointerInputContext {
  const worldPos = canvas.app.stage.toLocal(e.global)
  const ctx: PointerInputContext = {
    canvas,
    commandTarget,
    listenerId,
    eventType: e.type as PointerEventType,
    event: e,
    screenPos: new Point(e.global.x, e.global.y),
    worldPos,
    modifiers: getModifiers(e),
    _bubbleRequested: false,
    bubbleImmediate: () => {
      ctx._bubbleRequested = true
    },
  }
  return ctx
}

export function buildWheelContext(
  canvas: Canvas,
  commandTarget: TCommandTarget,
  e: WheelEvent,
  listenerId: string
): WheelInputContext {
  const rect = canvas.app.canvas.getBoundingClientRect()

  const ctx: WheelInputContext = {
    canvas,
    commandTarget,
    listenerId,
    eventType: 'wheel',
    event: e,
    screenPos: new Point(e.clientX - rect.left, e.clientY - rect.top),
    worldPos: canvas.app.stage.toLocal(new Point(e.clientX - rect.left, e.clientY - rect.top)),
    modifiers: getModifiers(e),
    _bubbleRequested: false,
    bubbleImmediate: () => {
      ctx._bubbleRequested = true
    },
  }
  return ctx
}

export function buildKeyboardContext(
  canvas: Canvas,
  commandTarget: TCommandTarget,
  e: KeyboardEvent,
  listenerId: string
): KeyboardInputContext {
  const ctx: KeyboardInputContext = {
    canvas,
    commandTarget,
    listenerId,
    eventType: 'keydown',
    event: e,
    modifiers: getModifiers(e),
    _bubbleRequested: false,
    bubbleImmediate: () => {
      ctx._bubbleRequested = true
    },
  }
  return ctx
}