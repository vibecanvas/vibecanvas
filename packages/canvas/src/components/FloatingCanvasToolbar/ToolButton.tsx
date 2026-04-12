/**
 * ToolButton Component
 * Individual tool button in the floating toolbar
 */

import type { JSX } from "solid-js";

interface ToolButtonProps {
  icon: JSX.Element;
  shortcut?: string;
  letterShortcut?: string;
  isActive: boolean;
  onClick: () => void;
}

export function ToolButton(props: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      class={`relative flex h-7 w-full items-center justify-center transition-colors ${
        props.isActive
          ? "bg-primary/15 text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      {props.icon}
      {props.letterShortcut && (
        <span
          class={`absolute bottom-0 left-px text-[7px] font-mono font-medium ${
            props.isActive
              ? "text-primary"
              : "text-muted-foreground/80"
          }`}
        >
          {props.letterShortcut}
        </span>
      )}
      {props.shortcut && (
        <span
          class={`absolute bottom-0 right-px text-[7px] font-mono font-medium ${
            props.isActive
              ? "text-primary"
              : "text-muted-foreground/80"
          }`}
        >
          {props.shortcut}
        </span>
      )}
    </button>
  );
}
