type TAsArray<T> = T extends any[] ? T : [T];

export class SyncHook<T, R = void> {
  #callbacks: ((...args: TAsArray<T>) => R)[] = [];

  tap(fn: (...args: TAsArray<T>) => R) {
    this.#callbacks.push(fn);
  }

  call(...args: TAsArray<T>): R[] {
    return this.#callbacks.map((cb) => cb(...args));
  }
}
