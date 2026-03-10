import { component, field } from "@lastolivegames/becsy";

const pointerTypes = ["mouse", "pen", "touch"];

@component export class PointerContact {
  @field.uint32 declare pointerId: number;
  @field.staticString(pointerTypes) declare pointerType: typeof pointerTypes[number];
  @field.boolean declare isPrimary: boolean;
  @field.int16 declare button: number;
  @field.uint16 declare buttons: number;
  @field.float64 declare pressure: number;
  @field.float64 declare startClientX: number;
  @field.float64 declare startClientY: number;
  @field.float64 declare clientX: number;
  @field.float64 declare clientY: number;
  @field.float64 declare startCanvasX: number;
  @field.float64 declare startCanvasY: number;
  @field.float64 declare canvasX: number;
  @field.float64 declare canvasY: number;
  @field.boolean declare altKey: boolean;
  @field.boolean declare ctrlKey: boolean;
  @field.boolean declare metaKey: boolean;
  @field.boolean declare shiftKey: boolean;
  @field.float64 declare timestamp: number;
}
