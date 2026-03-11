import { field } from "@lastolivegames/becsy";

/**
 * Per-frame accumulated wheel input.
 *
 * Wheel listeners add deltas into this singleton; later systems interpret the
 * totals once per frame instead of reacting to every browser wheel callback.
 */
export class WheelState {
  @field.float64 declare deltaX: number;
  @field.float64 declare deltaY: number;
  @field.float64 declare deltaZ: number;
  @field.uint16 declare eventCount: number;
  @field.boolean declare occurredThisFrame: boolean;
}
