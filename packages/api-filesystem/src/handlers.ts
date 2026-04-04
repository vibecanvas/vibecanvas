import { implement } from '@orpc/server';
import { apiFilesFilesystem } from './api.files-filesystem';
import { apiHomeFilesystem } from './api.home-filesystem';
import { apiInspectFilesystem } from './api.inspect-filesystem';
import { apiKeepaliveWatchFilesystem } from './api.keepalive-watch-filesystem';
import { apiListFilesystem } from './api.list-filesystem';
import { apiMoveFilesystem } from './api.move-filesystem';
import { apiReadFilesystem } from './api.read-filesystem';
import { apiUnwatchFilesystem } from './api.unwatch-filesystem';
import { apiWatchFilesystem } from './api.watch-filesystem';
import { apiWriteFilesystem } from './api.write-filesystem';
import { filesystemContract } from './contract';
import type { TFilesystemApiContext } from './types';

const baseFilesystemOs = implement(filesystemContract)
  .$context<TFilesystemApiContext>();

const filesystemHandlers = {
  home: baseFilesystemOs.home.handler(apiHomeFilesystem),
  list: baseFilesystemOs.list.handler(apiListFilesystem),
  files: baseFilesystemOs.files.handler(apiFilesFilesystem),
  move: baseFilesystemOs.move.handler(apiMoveFilesystem),
  inspect: baseFilesystemOs.inspect.handler(apiInspectFilesystem),
  read: baseFilesystemOs.read.handler(apiReadFilesystem),
  write: baseFilesystemOs.write.handler(apiWriteFilesystem),
  watch: baseFilesystemOs.watch.handler(apiWatchFilesystem),
  keepaliveWatch: baseFilesystemOs.keepaliveWatch.handler(apiKeepaliveWatchFilesystem),
  unwatch: baseFilesystemOs.unwatch.handler(apiUnwatchFilesystem),
};

export { baseFilesystemOs, filesystemHandlers };
