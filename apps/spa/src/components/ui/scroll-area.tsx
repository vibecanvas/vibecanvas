import type { JSX } from "solid-js"

type TScrollAreaProps = {
  class?: string
  viewportClass?: string
  children: JSX.Element
}

export function ScrollArea(props: TScrollAreaProps) {
  return (
    <div
      class={`min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] ${props.class ?? ""} ${props.viewportClass ?? ""}`}
    >
      {props.children}
    </div>
  )
}
