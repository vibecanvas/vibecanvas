import type { TAsArray } from './interfaces';
/**
 * List of callbacks that can be called in a loop.
 * The loop will be exited if any of the callbacks return true.
 */
export class SyncExitHook<T> {
  #callbacks: ((...args: TAsArray<T>) => boolean)[] = [];

  tap(fn: (...args: TAsArray<T>) => boolean) {
    this.#callbacks.push(fn);
  }

  call(...argsArr: TAsArray<T>): void {
    if (this.#callbacks.length) {
      for (let i = 0; i < this.#callbacks.length; i++) {
        const callback = this.#callbacks[i];
        const cancel = callback(...(argsArr as TAsArray<T>));
        if (cancel) break;
      }

    }
  }
}
