import { ctrlDirFiles } from '@vibecanvas/core/filesystem/ctrl.dir-files';
import { ctrlDirHome } from '@vibecanvas/core/filesystem/ctrl.dir-home';
import { ctrlDirList } from '@vibecanvas/core/filesystem/ctrl.dir-list';
import { ctrlFileInspect } from '@vibecanvas/core/filesystem/ctrl.file-inspect';
import { ctrlFileMove } from '@vibecanvas/core/filesystem/ctrl.file-move';
import { ctrlFileRead } from '@vibecanvas/core/filesystem/ctrl.file-read';
import type { IEventPublisherService } from '@vibecanvas/event-publisher-service/IEventPublisherService';
import { existsSync, readFileSync, readdirSync, renameSync, statSync, watch, writeFileSync, type FSWatcher } from 'fs';
import { homedir } from 'os';
import { basename, dirname, extname, join, resolve, sep } from 'path';
import type { IFilesystemService } from './IFilesystemService';
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

type TWatchEntry = {
  watcher: FSWatcher;
  abortController: AbortController;
  listeners: Set<string>;
  timeouts: Map<string, ReturnType<typeof setTimeout>>;
};

const WATCH_TTL_MS = 60 * 1000;

export class FilesystemServiceNode implements IFilesystemService {
  readonly name = 'filesystem' as const;

  #watchersByPath = new Map<string, TWatchEntry>();
  #watchIdToPath = new Map<string, string>();

  constructor(private eventPublisher: IEventPublisherService) {
  }

  home(): TErrTuple<{ path: string }> {
    return ctrlDirHome({ os: { homedir } }, {});
  }

  list(args: TFilesystemListArgs): TErrTuple<TFilesystemListResult> {
    return ctrlDirList({
      fs: { readdirSync, existsSync },
      path: { dirname, join },
    }, args);
  }

  files(args: TFilesystemFilesArgs): TErrTuple<TFilesystemFilesResult> {
    return ctrlDirFiles({
      fs: { readdirSync, existsSync, statSync },
      path: { join },
    }, args);
  }

  move(args: TFilesystemMoveArgs): TErrTuple<TFilesystemMoveResult> {
    return ctrlFileMove({
      fs: { existsSync, statSync, renameSync },
      path: { basename, join, resolve, sep },
    }, args);
  }

  inspect(args: TFilesystemInspectArgs): TErrTuple<TFilesystemInspectResult> {
    return ctrlFileInspect({
      fs: { statSync },
      path: { basename, extname },
    }, args);
  }

  read(args: TFilesystemReadArgs): TErrTuple<TFilesystemReadResult> {
    return ctrlFileRead({
      fs: { readFileSync, statSync },
      path: { extname },
    }, args);
  }

  write(args: TFilesystemWriteArgs): TErrTuple<TFilesystemWriteResult> {
    try {
      writeFileSync(args.path, args.content, 'utf8');
      return [{ success: true }, null];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to write file';
      return [null, {
        code: 'SRV.FILESYSTEM.WRITE.FAILED',
        statusCode: 500,
        externalMessage: { en: message },
      }];
    }
  }

  watch(path: string, watchId: string): AsyncIterable<TFilesystemWatchEvent> | null {
    if (this.#watchIdToPath.has(watchId)) return null;

    let entry = this.#watchersByPath.get(path);

    if (!entry) {
      const abortController = new AbortController();
      const watcher = watch(path, { signal: abortController.signal });
      entry = {
        watcher,
        abortController,
        listeners: new Set(),
        timeouts: new Map(),
      };

      watcher.on('change', (eventType: 'rename' | 'change', fileName) => {
        if (typeof fileName !== 'string') return;
        this.eventPublisher.publishFilesystemEvent(path, { eventType, fileName });
      });

      watcher.on('close', () => {
        this.#releasePath(path);
      });

      watcher.on('error', () => {
        this.#releasePath(path);
      });

      this.#watchersByPath.set(path, entry);
    }

    entry.listeners.add(watchId);
    this.#watchIdToPath.set(watchId, path);
    this.#resetTimeout(path, watchId);

    return this.eventPublisher.subscribeFilesystemEvents(path);
  }

  keepalive(watchId: string): boolean {
    const path = this.#watchIdToPath.get(watchId);
    if (!path) return false;
    if (!this.#watchersByPath.has(path)) return false;
    this.#resetTimeout(path, watchId);
    return true;
  }

  unwatch(watchId: string): void {
    const path = this.#watchIdToPath.get(watchId);
    if (!path) return;

    const entry = this.#watchersByPath.get(path);
    this.#watchIdToPath.delete(watchId);
    if (!entry) return;

    const timeout = entry.timeouts.get(watchId);
    if (timeout) {
      clearTimeout(timeout);
      entry.timeouts.delete(watchId);
    }

    entry.listeners.delete(watchId);
    if (entry.listeners.size > 0) return;

    this.#watchersByPath.delete(path);
    entry.abortController.abort();
  }

  stop(): void {
    for (const entry of this.#watchersByPath.values()) {
      for (const timeout of entry.timeouts.values()) {
        clearTimeout(timeout);
      }
      entry.abortController.abort();
    }

    this.#watchersByPath.clear();
    this.#watchIdToPath.clear();
  }

  #resetTimeout(path: string, watchId: string) {
    const entry = this.#watchersByPath.get(path);
    if (!entry) return;

    const existingTimeout = entry.timeouts.get(watchId);
    if (existingTimeout) clearTimeout(existingTimeout);

    entry.timeouts.set(watchId, setTimeout(() => {
      this.unwatch(watchId);
    }, WATCH_TTL_MS));
  }

  #releasePath(path: string) {
    const entry = this.#watchersByPath.get(path);
    if (!entry) return;

    this.#watchersByPath.delete(path);

    for (const watchId of entry.listeners) {
      this.#watchIdToPath.delete(watchId);
      const timeout = entry.timeouts.get(watchId);
      if (timeout) clearTimeout(timeout);
    }

    entry.listeners.clear();
    entry.timeouts.clear();
  }
}
