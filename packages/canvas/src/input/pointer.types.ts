export type TCanvasPointerPhase = "down" | "move" | "up" | "cancel";

export type TCanvasPointerType = "mouse" | "pen" | "touch";

export type TCanvasPointerInput = {
  phase: TCanvasPointerPhase;
  pointerId: number;
  pointerType: TCanvasPointerType;
  isPrimary: boolean;
  button: number;
  buttons: number;
  pressure: number;
  clientX: number;
  clientY: number;
  canvasX: number;
  canvasY: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  timestamp: number;
};
