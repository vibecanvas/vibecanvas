import type { IService, IStoppableService } from '@vibecanvas/runtime';
import type {
  TFilesystemFilesArgs,
  TFilesystemFilesResult,
  TFilesystemInspectArgs,
  TFilesystemInspectResult,
  TFilesystemListArgs,
  TFilesystemListResult,
  TFilesystemMoveArgs,
  TFilesystemMoveResult,
  TFilesystemReadArgs,
  TFilesystemReadResult,
  TFilesystemWatchEvent,
  TFilesystemWriteArgs,
  TFilesystemWriteResult,
} from './types';

export interface IFilesystemService extends IService, IStoppableService {
  home(): TErrTuple<{ path: string }>;
  list(args: TFilesystemListArgs): TErrTuple<TFilesystemListResult>;
  files(args: TFilesystemFilesArgs): TErrTuple<TFilesystemFilesResult>;
  move(args: TFilesystemMoveArgs): TErrTuple<TFilesystemMoveResult>;
  inspect(args: TFilesystemInspectArgs): TErrTuple<TFilesystemInspectResult>;
  read(args: TFilesystemReadArgs): TErrTuple<TFilesystemReadResult>;
  write(args: TFilesystemWriteArgs): TErrTuple<TFilesystemWriteResult>;
  watch(path: string, watchId: string): AsyncIterable<TFilesystemWatchEvent> | null;
  keepalive(watchId: string): boolean;
  unwatch(watchId: string): void;
}
