import { field } from "@lastolivegames/becsy";

const pointerTypes = ["mouse", "pen", "touch"];

/**
 * Tracks one currently active pointer contact.
 *
 * In ECS terms, this is the per-pointer entity created when a pointer goes down
 * and removed when that pointer goes up or is canceled. It stores the minimum
 * state needed by later input systems: where the contact started, where it is
 * now, which buttons/modifiers are active, and the latest timestamp/pressure.
 *
 * This is different from frame-level input state:
 * - `PointerContact` = one entity per active finger/mouse/pen contact
 * - `PointerFrame` = aggregate facts derived from all active contacts
 */
export class PointerContact {
  /** Stable browser pointer identifier for this active contact. */
  @field.uint32 declare pointerId: number;
  /** Device type normalized from platform input. */
  @field.staticString(pointerTypes) declare pointerType: typeof pointerTypes[number];
  /** Whether the browser reported this as the primary pointer. */
  @field.boolean declare isPrimary: boolean;
  /** Button changed on the latest event. */
  @field.int16 declare button: number;
  /** Bitmask of all currently pressed buttons for this pointer. */
  @field.uint16 declare buttons: number;
  /** Latest normalized pressure value. */
  @field.float64 declare pressure: number;
  /** Client-space X where this contact began. */
  @field.float64 declare startClientX: number;
  /** Client-space Y where this contact began. */
  @field.float64 declare startClientY: number;
  /** Latest client-space X. */
  @field.float64 declare clientX: number;
  /** Latest client-space Y. */
  @field.float64 declare clientY: number;
  /** Canvas/world-space X where this contact began. */
  @field.float64 declare startCanvasX: number;
  /** Canvas/world-space Y where this contact began. */
  @field.float64 declare startCanvasY: number;
  /** Latest canvas/world-space X. */
  @field.float64 declare canvasX: number;
  /** Latest canvas/world-space Y. */
  @field.float64 declare canvasY: number;
  /** Alt modifier snapshot from the latest event. */
  @field.boolean declare altKey: boolean;
  /** Ctrl modifier snapshot from the latest event. */
  @field.boolean declare ctrlKey: boolean;
  /** Meta modifier snapshot from the latest event. */
  @field.boolean declare metaKey: boolean;
  /** Shift modifier snapshot from the latest event. */
  @field.boolean declare shiftKey: boolean;
  /** Timestamp from the latest event for this contact. */
  @field.float64 declare timestamp: number;
}
