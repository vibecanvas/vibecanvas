import type { TAsArray } from './interfaces';
export class SyncHook<T, R = void> {
  #callbacks: ((...args: TAsArray<T>) => R)[] = [];

  tap(fn: (...args: TAsArray<T>) => R) {
    this.#callbacks.push(fn);
  }

  call(...argsArr: TAsArray<T>): R[] {
    return this.#callbacks.map(function (callback) {
      /* eslint-disable-next-line prefer-spread */
      return callback.apply(void 0, argsArr);
    });
  }
}
