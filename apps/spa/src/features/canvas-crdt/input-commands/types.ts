import type { FederatedPointerEvent, Point } from "pixi.js";
import type { Canvas } from "../canvas/canvas";
import type { AElement } from "../renderables/element.abstract";
import type { MultiTransformBox } from "../renderables/transform-box/multi-transform-box";
import type { TransformBox } from "../renderables/transform-box/transform-box";
import type { VirtualGroup } from "../renderables/virtual-group.class";

export type Modifiers = {
  shift: boolean
  ctrl: boolean
  meta: boolean
  alt: boolean
}

export type WheelEventType = 'wheel'
export type PointerEventType = 'pointerdown' | 'pointermove' | 'pointerup' | 'pointerupoutside'
export type KeyboardEventType = 'keydown' | 'keyup'
export type InputEventType = WheelEventType | PointerEventType | KeyboardEventType

// Target union - the source of the event
export type TCommandTarget = Canvas | AElement | TransformBox | MultiTransformBox | VirtualGroup

// Base properties shared by all contexts
type BaseInputContext = {
  canvas: Canvas
  modifiers: Modifiers
  _bubbleRequested: boolean
  // to signal to skip this chain and let parent chain handle
  bubbleImmediate: () => void
}

// Command target context properties
type CommandTargetContext = {
  commandTarget: TCommandTarget          // Target that owns the command chain
  listenerId: string                     // Which listener: "nw", "rotation", "body", "stage"
}

// Wheel event - has positions
export type WheelInputContext = BaseInputContext & CommandTargetContext & {
  eventType: WheelEventType
  event: WheelEvent
  screenPos: Point
  worldPos: Point
}

// Pointer events - have positions
export type PointerInputContext = BaseInputContext & CommandTargetContext & {
  eventType: PointerEventType
  event: FederatedPointerEvent
  screenPos: Point
  worldPos: Point
}

// Keyboard events - no positions
export type KeyboardInputContext = BaseInputContext & CommandTargetContext & {
  eventType: KeyboardEventType
  event: KeyboardEvent
}

// Discriminated union - narrow by checking eventType
export type InputContext = WheelInputContext | PointerInputContext | KeyboardInputContext

// Command returns true = handled (stop chain), false = not handled (continue)
export type InputCommand = (ctx: InputContext) => boolean

// Type guards for commands that only handle specific event types
export function isWheelContext(ctx: InputContext): ctx is WheelInputContext {
  return ctx.eventType === 'wheel'
}

export function isPointerContext(ctx: InputContext): ctx is PointerInputContext {
  return ctx.eventType === 'pointerdown' || ctx.eventType === 'pointermove' ||
         ctx.eventType === 'pointerup' || ctx.eventType === 'pointerupoutside'
}

export function isKeyboardContext(ctx: InputContext): ctx is KeyboardInputContext {
  return ctx.eventType === 'keydown' || ctx.eventType === 'keyup'
}

// Type guard for TransformBox target (individual item transform)
export function isTransformBoxTarget(target: TCommandTarget): target is TransformBox {
  return 'frameEdges' in target && 'cornerHandles' in target
}

// Type guard for MultiTransformBox target (multi-select multi transform)
export function isMultiTransformBoxTarget(target: TCommandTarget): target is MultiTransformBox {
  return 'members' in target && 'computeGroupBounds' in target
}

// Type guard for ADrawingRenderable target
export function isElementTarget(target: TCommandTarget): target is AElement {
  return '_isSelected' in target && '_isDragging' in target && '_isResizing' in target && '_isRotating' in target
}

// Type guard for Canvas target
export function isCanvasTarget(target: TCommandTarget): target is Canvas {
  return 'app' in target && 'elements' in target
}

// Type guard for VirtualGroup target
export function isVirtualGroupTarget(target: TCommandTarget): target is VirtualGroup {
  return 'members' in target && 'group' in target && !('computeGroupBounds' in target)
}

