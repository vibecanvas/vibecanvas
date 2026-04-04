import { canvasHandlers } from '@vibecanvas/api-canvas/handlers';
import { fileHandlers } from '@vibecanvas/api-file/handlers';
import { ptyHandlers } from '@vibecanvas/api-pty/handlers';

const router = {
  api: {
    canvas: canvasHandlers,
    file: fileHandlers,
    pty: ptyHandlers,
  },
};

export { router };
