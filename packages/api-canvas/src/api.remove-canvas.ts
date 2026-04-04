import { baseCanvasOs } from './orpc';

const apiRemoveCanvas = baseCanvasOs.remove.handler(async () => {
  throw new Error('api-canvas remove WIP: requires repo service extraction');
});

export { apiRemoveCanvas };
