import { component, field } from "@lastolivegames/becsy";
import type { TCanvasPointerInput } from "../../input/pointer.types";

@component export class PointerFrame {
  @field.object declare events: TCanvasPointerInput[];
  @field.uint8 declare activePointerCount: number;
  @field.boolean declare hasMultiTouch: boolean;
  @field.int32 declare primaryPointerId: number;
  @field.float64 declare centroidClientX: number;
  @field.float64 declare centroidClientY: number;
  @field.float64 declare centroidCanvasX: number;
  @field.float64 declare centroidCanvasY: number;
  @field.float64 declare pinchDistance: number;
}
