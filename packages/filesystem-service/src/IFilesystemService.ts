import type { Dirent, Stats } from 'fs';
import type { IService, IStoppableService } from '@vibecanvas/runtime';
import type { TFilesystemWatchEvent } from './types';

export interface IFilesystemService extends IService, IStoppableService {
  homeDir(): string;
  exists(path: string): boolean;
  readdir(path: string): TErrTuple<Dirent[]>;
  stat(path: string): TErrTuple<Stats>;
  readFile(path: string): TErrTuple<Buffer>;
  writeFile(path: string, content: string): TErrTuple<void>;
  rename(sourcePath: string, targetPath: string): TErrTuple<void>;
  watch(path: string, watchId: string): AsyncIterable<TFilesystemWatchEvent> | null;
  keepalive(watchId: string): boolean;
  unwatch(watchId: string): void;
}
