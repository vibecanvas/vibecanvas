const CANVAS_DEBUG = false;

function logCanvasDebug(message: string, payload?: unknown) {
  if (!CANVAS_DEBUG) return;

  if (payload === undefined) {
    console.log(message);
    return;
  }

  console.log(message, payload);
}

export { CANVAS_DEBUG, logCanvasDebug };
