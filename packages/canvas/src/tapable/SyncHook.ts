import type { TAsArray } from './interfaces';
export class SyncHook<T> {
  #callbacks: ((...args: TAsArray<T>) => void)[] = [];

  tap(fn: (...args: TAsArray<T>) => void) {
    this.#callbacks.push(fn);
  }

  call(...argsArr: TAsArray<T>): void {
    this.#callbacks.forEach(function (callback) {
      /* eslint-disable-next-line prefer-spread */
      callback.apply(void 0, argsArr);
    });
  }
}
