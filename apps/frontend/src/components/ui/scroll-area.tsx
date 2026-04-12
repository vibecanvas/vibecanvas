import type { JSX } from "solid-js"

type TScrollAreaProps = {
  class?: string
  viewportClass?: string
  children: JSX.Element
}

export function ScrollArea(props: TScrollAreaProps) {
  return (
    <div
      class={`min-h-0 overflow-y-auto overflow-x-hidden ${props.class ?? ""} ${props.viewportClass ?? ""}`}
      style={{ "scrollbar-width": "thin" }}
    >
      {props.children}
    </div>
  )
}
