const patchKey = "__vibecanvas_negative_timeout_patch__"

if (!(globalThis as Record<string, unknown>)[patchKey]) {
  const nativeSetTimeout = globalThis.setTimeout.bind(globalThis)

  globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    const delay = typeof timeout === "number" && timeout < 0 ? 0 : timeout
    return nativeSetTimeout(handler, delay, ...args)
  }) as typeof setTimeout

  ;(globalThis as Record<string, unknown>)[patchKey] = true
}
