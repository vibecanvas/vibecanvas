import type { Dirent, Stats } from 'fs';
import type { IService, IStoppableService } from '@vibecanvas/runtime';
import type { TFilesystemWatchEvent } from './types';

export interface IFilesystemService extends IService, IStoppableService {
  homeDir(filesystemId: string): string;
  exists(filesystemId: string, path: string): boolean;
  readdir(filesystemId: string, path: string): TErrTuple<Dirent[]>;
  stat(filesystemId: string, path: string): TErrTuple<Stats>;
  readFile(filesystemId: string, path: string): TErrTuple<Buffer>;
  writeFile(filesystemId: string, path: string, content: string): TErrTuple<void>;
  rename(filesystemId: string, sourcePath: string, targetPath: string): TErrTuple<void>;
  watch(filesystemId: string, path: string, watchId: string): AsyncIterable<TFilesystemWatchEvent> | null;
  keepalive(filesystemId: string, watchId: string): boolean;
  unwatch(filesystemId: string, watchId: string): void;
}
