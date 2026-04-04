import { baseCanvasOs } from './orpc';

const apiCreateCanvas = baseCanvasOs.create.handler(async () => {
  throw new Error('api-canvas create WIP: requires repo service extraction');
});

export { apiCreateCanvas };
