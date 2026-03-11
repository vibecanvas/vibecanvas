import { field } from "@lastolivegames/becsy";

const requestedTools = [
  "none",
  "hand",
  "select",
  "rectangle",
  "diamond",
  "ellipse",
  "arrow",
  "line",
  "pen",
  "text",
  "image",
  "chat",
  "filesystem",
  "terminal",
] as const;

/**
 * Semantic input actions resolved from raw device state.
 *
 * Raw pointer/keyboard/wheel buffers answer "what happened on devices?".
 * `ActionBuffer` answers "which app-level actions are active or triggered?".
 * Multiple shortcuts can map into the same action bits.
 */
export class ActionBuffer {
  @field.uint32 declare activeMask: number;
  @field.uint32 declare startedMask: number;
  @field.uint32 declare endedMask: number;
  @field.uint32 declare triggeredMask: number;
  @field.staticString([...requestedTools]) declare requestedTool: typeof requestedTools[number];
}
