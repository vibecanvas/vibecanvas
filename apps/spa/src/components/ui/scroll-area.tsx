import type { JSX } from "solid-js"

type TScrollAreaProps = {
  class?: string
  viewportClass?: string
  children: JSX.Element
}

export function ScrollArea(props: TScrollAreaProps) {
  return (
    <div
      class={`relative h-full min-h-0 overflow-scroll ${props.class ?? ""}`}
      onWheel={(e: WheelEvent) => e.stopPropagation()}
    >
      <div
        class={`h-full min-h-0 w-full overflow-y-auto overflow-x-hidden pr-1 [scrollbar-width:thin] ${props.viewportClass ?? ""}`}
      >
        {props.children}
      </div>
    </div>
  )
}
