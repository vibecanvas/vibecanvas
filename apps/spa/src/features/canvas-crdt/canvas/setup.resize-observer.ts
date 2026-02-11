import type { Application } from "pixi.js"

type TSetupResizeObserverParams = {
  ref: HTMLElement
  app: Application
}

export function setupResizeObserver({ ref, app }: TSetupResizeObserverParams) {
  const resizeObserver = new ResizeObserver(() => {
    app.resize()
  })
  resizeObserver.observe(ref)

  return {
    resizeObserver,
    cleanup: () => {
      resizeObserver.disconnect()
    }
  }
}
