import { watch } from "fs"
import type { EventPublisher } from "@orpc/server";

export class FileSystemWatcher {
  private watchers: { [path: string]: { watcher: ReturnType<typeof watch>, abortController: AbortController, listeners: Set<string> } } = {}

  constructor(private eventPublisher: EventPublisher<{ [path: string]: { eventType: 'rename' | 'change', fileName: string } }>) {
  }

  registerPath(uuid: string, path: string) {
    this.unregisterPath(uuid);

    const existingWatcher = this.watchers[path];
    if (existingWatcher) {
      existingWatcher.listeners.add(uuid);
      return
    }

    const abortController = new AbortController();
    const watcher = watch(path, { signal: abortController.signal });
    watcher.on('change', (eventType: 'rename' | 'change', fileName) => {
      if (typeof fileName !== 'string') return;
      this.eventPublisher.publish(path, { eventType, fileName })
    })
    watcher.on('close', () => this.cleanupPath(path));
    watcher.on('error', () => this.cleanupPath(path));
    this.watchers[path] = { watcher, abortController, listeners: new Set([uuid]) };
  }

  unregisterPath(uuid: string) {
    const entry = Object.entries(this.watchers).find(([, watcher]) => watcher.listeners.has(uuid));
    if (!entry) {
      return;
    }
    const [path, watcher] = entry;
    watcher.listeners.delete(uuid);
    if (watcher.listeners.size === 0) {
      watcher.abortController.abort();
      delete this.watchers[path];
    }
  }

  private cleanupPath(path: string) {
    const entry = this.watchers[path];
    if (!entry) return;
    entry.abortController.abort();
    delete this.watchers[path];
  }
}