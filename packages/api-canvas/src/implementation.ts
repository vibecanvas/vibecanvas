async function notImplemented(): Promise<never> {
  throw new Error('api-canvas WIP');
}

const canvasImplementation = {
  list: notImplemented,
  get: notImplemented,
  create: notImplemented,
  update: notImplemented,
  remove: notImplemented,
};

export { canvasImplementation };
