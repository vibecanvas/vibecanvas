import { canvasHandlers } from '@vibecanvas/api-canvas/handlers';
import { dbHandlers } from '@vibecanvas/api-db/handlers';
import { fileHandlers } from '@vibecanvas/api-file/handlers';
import { filesystemHandlers } from '@vibecanvas/api-filesystem/handlers';
import { filetreeHandlers } from '@vibecanvas/api-filetree/handlers';
import { notificationHandlers } from '@vibecanvas/api-notification/handlers';
import { ptyHandlers } from '@vibecanvas/api-pty/handlers';

const router = {
  api: {
    canvas: canvasHandlers,
    db: dbHandlers,
    file: fileHandlers,
    filesystem: filesystemHandlers,
    filetree: filetreeHandlers,
    notification: notificationHandlers,
    pty: ptyHandlers,
  },
};

export { router };
