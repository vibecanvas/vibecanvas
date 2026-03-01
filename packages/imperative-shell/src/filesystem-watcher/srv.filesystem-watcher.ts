import { watch } from "fs"
import type { EventPublisher } from "@orpc/server";

export class FileSystemWatcher {
  private watchers: { [path: string]: { watcher: ReturnType<typeof watch>, abortController: AbortController, listeners: Set<string>, timeout: NodeJS.Timeout } } = {}

  constructor(private eventPublisher: EventPublisher<{ [path: string]: { eventType: 'rename' | 'change', fileName: string } }>) {
  }

  getById(uuid: string) {
    const entry = Object.entries(this.watchers).find(([, watcher]) => watcher.listeners.has(uuid));
    if (!entry) return null;
    const [path, watcher] = entry;
    return { path, watcher }
  }

  getByPath(path: string): typeof this.watchers[string] | null {
    return this.watchers[path] ?? null;
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
    watcher.on('close', () => this.unregisterPath(uuid));
    watcher.on('error', () => this.unregisterPath(uuid));
    const timeout = setTimeout(() => {
      this.unregisterPath(uuid);
    }, 60 * 1000)
    this.watchers[path] = { watcher, abortController, listeners: new Set([uuid]), timeout };
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

  keepalive(uuid: string) {
    const entry = this.getById(uuid);
    if (!entry) return false;
    clearTimeout(entry.watcher.timeout);
    entry.watcher.timeout = setTimeout(() => {
      this.unregisterPath(uuid);
    }, 60 * 1000)
    return true;
  }

}