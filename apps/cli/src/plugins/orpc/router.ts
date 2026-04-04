import { canvasHandlers } from '@vibecanvas/api-canvas/handlers';
import { fileHandlers } from '@vibecanvas/api-file/handlers';

const router = {
  api: {
    canvas: canvasHandlers,
    file: fileHandlers,
  },
};

export { router };
