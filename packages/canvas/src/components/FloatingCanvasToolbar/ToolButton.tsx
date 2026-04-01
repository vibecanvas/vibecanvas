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
          ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
          : "text-muted-foreground hover:bg-stone-200 dark:hover:bg-stone-800"
      }`}
    >
      {props.icon}
      {props.letterShortcut && (
        <span
          class={`absolute bottom-0 left-px text-[7px] font-mono font-medium ${
            props.isActive
              ? "text-amber-600 dark:text-amber-500"
              : "text-stone-400 dark:text-stone-500"
          }`}
        >
          {props.letterShortcut}
        </span>
      )}
      {props.shortcut && (
        <span
          class={`absolute bottom-0 right-px text-[7px] font-mono font-medium ${
            props.isActive
              ? "text-amber-600 dark:text-amber-500"
              : "text-stone-400 dark:text-stone-500"
          }`}
        >
          {props.shortcut}
        </span>
      )}
    </button>
  );
}
