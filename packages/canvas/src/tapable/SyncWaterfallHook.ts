import type { TAsArray } from './interfaces';
export class SyncWaterfallHook<T, R> {
  #callbacks: ((...args: TAsArray<T>) => R)[] = [];

  tap(fn: (...args: TAsArray<T>) => R) {
    this.#callbacks.push(fn);
  }

  call(...argsArr: TAsArray<T>): R {
    if (this.#callbacks.length) {
      /* eslint-disable-next-line prefer-spread */
      let result = this.#callbacks[0].apply(void 0, argsArr);
      for (let i = 1; i < this.#callbacks.length; i++) {
        const callback = this.#callbacks[i];
        result = callback(...(result as TAsArray<T>));
      }

      return result;
    }

    return argsArr[0] as unknown as R;
  }
}
