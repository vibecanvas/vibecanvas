import { field } from "@lastolivegames/becsy";

export const keyboardMaskWordCount = 4;

/**
 * Dense keyboard input buffer.
 *
 * The masks are split into fixed-size 32-bit words so input systems can track
 * key down / pressed / released state without storing dynamic maps or DOM event
 * objects inside ECS.
 */
export class KeyboardState {
  @field.uint8 declare modifiersMask: number;
  @field.uint32.vector(keyboardMaskWordCount) declare downMask: [number, number, number, number];
  @field.uint32.vector(keyboardMaskWordCount) declare pressedMask: [number, number, number, number];
  @field.uint32.vector(keyboardMaskWordCount) declare releasedMask: [number, number, number, number];
}
