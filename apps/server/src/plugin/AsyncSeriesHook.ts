type TAsArray<T> = T extends any[] ? T : [T];

/**
 * Executes callbacks sequentially (await each before next).
 * Use for ordered async lifecycles like boot and shutdown.
 */
export class AsyncSeriesHook<T> {
  #callbacks: ((...args: TAsArray<T>) => Promise<void>)[] = [];

  tapPromise(fn: (...args: TAsArray<T>) => Promise<void>) {
    this.#callbacks.push(fn);
  }

  async promise(...args: TAsArray<T>): Promise<void> {
    for (const callback of this.#callbacks) {
      await callback(...args);
    }
  }
}
