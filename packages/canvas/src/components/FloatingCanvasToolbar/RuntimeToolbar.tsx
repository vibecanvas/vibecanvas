import Grid2x2 from "lucide-solid/icons/grid-2x2";
import Hand from "lucide-solid/icons/hand";
import Image from "lucide-solid/icons/image";
import MousePointer2 from "lucide-solid/icons/mouse-pointer-2";
import Type from "lucide-solid/icons/type";
import type { Accessor } from "solid-js";
import { For, createSignal } from "solid-js";
import { ToolButton } from "./ToolButton";

export type TRuntimeToolbarTool = {
  id: string;
  label: string;
  shortcuts?: string[];
  active?: boolean;
};

export type TRuntimeToolbarProps = {
  tools: Accessor<TRuntimeToolbarTool[]>;
  activeToolId: Accessor<string>;
  onToolSelect: (toolId: string) => void;
};

function getToolIcon(toolId: string) {
  if (toolId === "hand") {
    return <Hand size={14} />;
  }

  if (toolId === "select") {
    return <MousePointer2 size={14} />;
  }

  if (toolId === "grid") {
    return <Grid2x2 size={14} />;
  }

  if (toolId === "image") {
    return <Image size={14} />;
  }

  if (toolId === "text") {
    return <Type size={14} />;
  }

  return <span class="text-[10px] font-mono uppercase">{toolId.slice(0, 2)}</span>;
}

function getShortcutParts(shortcuts: string[] | undefined) {
  if (!shortcuts || shortcuts.length === 0) {
    return { shortcut: undefined, letterShortcut: undefined };
  }

  const letterShortcut = shortcuts.find((shortcut) => shortcut.length <= 3 && /^[a-zA-Z]+$/.test(shortcut));
  const shortcut = shortcuts.find((candidate) => candidate !== letterShortcut) ?? shortcuts[0];

  return {
    shortcut: shortcut === letterShortcut ? undefined : shortcut,
    letterShortcut,
  };
}

export function RuntimeToolbar(props: TRuntimeToolbarProps) {
  const [isCollapsed, setIsCollapsed] = createSignal(false);

  return (
    <div class="absolute top-3 right-3 pointer-events-none z-50 flex flex-row-reverse items-start gap-1.5">
      <div class="pointer-events-auto flex flex-col bg-card shadow-md border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setIsCollapsed((value) => !value)}
          class="w-9 px-1 py-0.5 font-display text-[10px] text-muted-foreground tracking-wide text-center border-b border-border hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
        >
          TOOLS
        </button>
        {isCollapsed() ? null : (
          <div class="flex flex-col">
            <For each={props.tools()}>
              {(tool) => {
                const shortcutParts = getShortcutParts(tool.shortcuts);
                return (
                  <ToolButton
                    icon={getToolIcon(tool.id)}
                    shortcut={shortcutParts.shortcut}
                    letterShortcut={shortcutParts.letterShortcut}
                    isActive={props.activeToolId() === tool.id || Boolean(tool.active)}
                    onClick={() => props.onToolSelect(tool.id)}
                  />
                );
              }}
            </For>
          </div>
        )}
      </div>

      <div class="opacity-50 flex flex-col gap-0.5 text-[9px] text-muted-foreground font-mono pt-0.5">
        <div class="flex items-center gap-1">
          <kbd class="w-10 px-1 py-0.5 bg-card border border-border text-[8px] text-center">Middle</kbd>
          <span>Pan</span>
        </div>
        <div class="flex items-center gap-1">
          <kbd class="w-10 px-1 py-0.5 bg-card border border-border text-[8px] text-center">Space</kbd>
          <span>Drag</span>
        </div>
      </div>
    </div>
  );
}
