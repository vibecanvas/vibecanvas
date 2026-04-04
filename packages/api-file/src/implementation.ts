async function notImplemented(): Promise<never> {
  throw new Error('api-file WIP');
}

const fileImplementation = {
  put: notImplemented,
  clone: notImplemented,
  remove: notImplemented,
};

export { fileImplementation };
