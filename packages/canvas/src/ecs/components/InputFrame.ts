import { field } from "@lastolivegames/becsy";

/**
 * Frame-scoped counters for the input pipeline.
 *
 * This singleton is reset/reused every frame and lets input systems know
 * whether any input happened and how much raw input was consumed.
 */
export class InputFrame {
  @field.uint32 declare frameNumber: number;
  @field.boolean declare hadInputThisFrame: boolean;
  @field.uint16 declare pointerEventCount: number;
  @field.uint16 declare keyboardEventCount: number;
  @field.uint16 declare wheelEventCount: number;
}
