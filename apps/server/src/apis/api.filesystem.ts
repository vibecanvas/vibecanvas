import { ctrlDirFiles } from "@vibecanvas/core/filesystem/ctrl.dir-files";
import { ctrlDirHome } from "@vibecanvas/core/filesystem/ctrl.dir-home";
import { ctrlDirList } from "@vibecanvas/core/filesystem/ctrl.dir-list";
import { ctrlFileMove } from "@vibecanvas/core/filesystem/ctrl.file-move";
import { ctrlFileInspect } from "@vibecanvas/core/filesystem/ctrl.file-inspect";
import { ctrlFileRead } from "@vibecanvas/core/filesystem/ctrl.file-read";
import { existsSync, readFileSync, readdirSync, renameSync, statSync } from "fs";
import { homedir } from "os";
import { basename, dirname, extname, join, resolve, sep } from "path";
import { EventPublisher, ORPCError } from "@orpc/server";
import { FileSystemWatcher } from "@vibecanvas/shell/filesystem-watcher/srv.filesystem-watcher";
import { baseOs } from "../orpc.base";

const dirPortal = {
  os: { homedir },
  fs: { readdirSync, existsSync, statSync, renameSync, readFileSync },
  path: { dirname, join, basename, resolve, sep, extname },
};

const home = baseOs.api.filesystem.home.handler(async ({ }) => {
  const [result, error] = ctrlDirHome(dirPortal, {});
  if (error || !result) {
    return { type: error?.code ?? "ERROR", message: error?.externalMessage?.en ?? "Failed to get home directory" };
  }
  return result;
});

const list = baseOs.api.filesystem.list.handler(async ({ input }) => {
  const [result, error] = ctrlDirList(dirPortal, { ...input.query });
  if (error || !result) {
    return { type: error?.code ?? "ERROR", message: error?.externalMessage?.en ?? "Failed to list directory" };
  }
  return result;
});

const files = baseOs.api.filesystem.files.handler(async ({ input }) => {
  const home = homedir();
  const [result, error] = ctrlDirFiles(dirPortal, {
    path: input.query.path ?? home,
    glob_pattern: input.query.glob_pattern,
    max_depth: input.query.max_depth,
  });
  if (error || !result) {
    return { type: error?.code ?? "ERROR", message: error?.externalMessage?.en ?? "Failed to list files" };
  }
  return result;
});

const move = baseOs.api.filesystem.move.handler(async ({ input }) => {
  const [result, error] = ctrlFileMove(dirPortal, {
    source_path: input.body.source_path,
    destination_dir_path: input.body.destination_dir_path,
  });
  if (error || !result) {
    return { type: error?.code ?? "ERROR", message: error?.externalMessage?.en ?? "Failed to move file or folder" };
  }
  return result;
});

const inspect = baseOs.api.filesystem.inspect.handler(async ({ input }) => {
  const [result, error] = ctrlFileInspect(dirPortal, { path: input.query.path });
  if (error || !result) {
    return { type: error?.code ?? "ERROR", message: error?.externalMessage?.en ?? "Failed to inspect file" };
  }
  return result;
});

const read = baseOs.api.filesystem.read.handler(async ({ input }) => {
  const [result, error] = ctrlFileRead(dirPortal, {
    path: input.query.path,
    maxBytes: input.query.maxBytes,
  });
  if (error || !result) {
    return { type: error?.code ?? "ERROR", message: error?.externalMessage?.en ?? "Failed to read file" };
  }
  return result;
});

const fsPublisher = new EventPublisher<{ [path: string]: { eventType: 'rename' | 'change', fileName: string } }>();
const fileSystemWatcher = new FileSystemWatcher(fsPublisher);

const watch = baseOs.api.filesystem.watch.handler(async function* ({ input: { path, watchId } }) {
  if (fileSystemWatcher.getById(watchId)) throw new ORPCError('CONFLICT', { message: `Watch ${watchId} already exists` })
  fileSystemWatcher.registerPath(watchId, path);
  try {
    for await (const event of fsPublisher.subscribe(path)) {
      yield event;
    }
  } finally {
    fileSystemWatcher.unregisterPath(watchId);
  }
});

const keepaliveWatch = baseOs.api.filesystem.keepaliveWatch.handler(async ({ input: { watchId } }) => {
  if (!fileSystemWatcher.getById(watchId)) throw new ORPCError('NOT_FOUND', { message: `Watch ${watchId} not found` })
  return fileSystemWatcher.keepalive(watchId);
});

const unwatch = baseOs.api.filesystem.unwatch.handler(async ({ input: { watchId } }) => {
  fileSystemWatcher.unregisterPath(watchId);
  return;
});

export const filesystem = {
  home,
  list,
  files,
  move,
  inspect,
  read,
  watch,
  keepaliveWatch,
  unwatch,
};
