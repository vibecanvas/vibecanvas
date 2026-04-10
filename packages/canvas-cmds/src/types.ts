export type TCanvasCmdErrorDetails = {
  ok: false;
  command: string;
  code: string;
  message: string;
  canvasId?: string | null;
  canvasNameQuery?: string | null;
  matches?: Array<{ id: string; name: string }>;
};