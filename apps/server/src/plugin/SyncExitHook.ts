type TAsArray<T> = T extends any[] ? T : [T];

/**
 * Loops through callbacks; exits early if any returns true.
 */
export class SyncExitHook<T> {
  #callbacks: ((...args: TAsArray<T>) => boolean)[] = [];

  tap(fn: (...args: TAsArray<T>) => boolean) {
    this.#callbacks.push(fn);
  }

  call(...args: TAsArray<T>): boolean {
    for (const callback of this.#callbacks) {
      if (callback(...args)) return true;
    }
    return false;
  }
}
