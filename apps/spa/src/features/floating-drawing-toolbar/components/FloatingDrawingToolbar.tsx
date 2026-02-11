/**
 * FloatingDrawingToolbar Component
 * Excalidraw-style floating toolbar at top center of canvas
 * Tool selection persisted in SolidJS store
 */

import Hand from "lucide-solid/icons/hand";
import MousePointer2 from "lucide-solid/icons/mouse-pointer-2";
import Square from "lucide-solid/icons/square";
import Diamond from "lucide-solid/icons/diamond";
import Circle from "lucide-solid/icons/circle";
import ArrowRight from "lucide-solid/icons/arrow-right";
import Minus from "lucide-solid/icons/minus";
import Pencil from "lucide-solid/icons/pencil";
import Type from "lucide-solid/icons/type";
import Image from "lucide-solid/icons/image";
import MessageCircle from "lucide-solid/icons/message-circle";
import PanelLeft from "lucide-solid/icons/panel-left";
import { Tooltip } from "@kobalte/core/tooltip";
import { For, Show, createMemo } from "solid-js";
import type { JSX } from "solid-js";
import { ToolButton } from "./ToolButton";
import type { Tool } from "../types/toolbar.types";
import { store, setStore } from "@/store";

const TOOL_ICONS: Record<Tool, () => JSX.Element> = {
  hand: () => <Hand size={14} />,
  select: () => <MousePointer2 size={14} />,
  rectangle: () => <Square size={14} />,
  diamond: () => <Diamond size={14} />,
  ellipse: () => <Circle size={14} />,
  arrow: () => <ArrowRight size={14} />,
  line: () => <Minus size={14} />,
  pen: () => <Pencil size={14} />,
  text: () => <Type size={14} />,
  image: () => <Image size={14} />,
  chat: () => <MessageCircle size={14} />,
};

const TOOL_CONFIG: { tool: Tool; shortcut?: string; letterShortcut?: string }[] = [
  { tool: "hand", letterShortcut: "h" },
  { tool: "select", shortcut: "1", letterShortcut: "esc" },
  { tool: "rectangle", shortcut: "2", letterShortcut: "r" },
  { tool: "diamond", shortcut: "3", letterShortcut: "d" },
  { tool: "ellipse", shortcut: "4", letterShortcut: "o" },
  { tool: "arrow", shortcut: "5", letterShortcut: "a" },
  { tool: "line", shortcut: "6", letterShortcut: "l" },
  { tool: "pen", shortcut: "7", letterShortcut: "p" },
  { tool: "text", shortcut: "8", letterShortcut: "t" },
  { tool: "image", shortcut: "9" },
  { tool: "chat", letterShortcut: "c" },
];

// Detect Mac for keyboard shortcut display
const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export function FloatingDrawingToolbar() {
  // Store state - reactive access
  const activeTool = createMemo(() => store.toolbarSlice.activeTool);
  const isCollapsed = createMemo(() => store.toolbarSlice.isCollapsed);

  // Actions
  const setActiveTool = (tool: Tool) => {
    setStore("toolbarSlice", "activeTool", tool);
  };

  const toggleCollapsed = () => {
    setStore("toolbarSlice", "isCollapsed", (v) => !v);
  };

  // Handle tool click - special handling for image tool
  const handleToolClick = (tool: Tool) => {
    if (tool === "image") {
      // Open file picker for image
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          // Dispatch custom event for canvas to handle
          window.dispatchEvent(new CustomEvent("canvas:image-selected", { detail: { file } }));
        }
      };
      input.click();
    } else {
      setActiveTool(tool);
    }
  };

  return (
    <div class="fixed top-3 right-3 pointer-events-none z-50 flex flex-row-reverse items-start gap-1.5">
      {/* Main toolbar */}
      <div class="pointer-events-auto flex flex-col bg-card shadow-md border border-border overflow-hidden">
        {/* Terminal header - clickable toggle */}
        <Tooltip openDelay={400} closeDelay={0} placement="left">
          <Tooltip.Trigger
            as="button"
            type="button"
            onClick={toggleCollapsed}
            class="w-9 px-1 py-0.5 font-display text-[10px] text-muted-foreground tracking-wide text-center cursor-pointer hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
          >
            TOOLS
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content class="z-50 px-2 py-1 bg-stone-800 dark:bg-stone-200 text-stone-100 dark:text-stone-800 text-xs font-mono shadow-md">
              {isCollapsed() ? "Expand tools" : "Collapse tools"}
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip>

        {/* Tool buttons - hidden when collapsed */}
        <Show when={!isCollapsed()}>
          <div class="flex flex-col">
            {/* Hand tool (no shortcut) - when selected, drag = pan canvas */}
            <ToolButton
              icon={TOOL_ICONS.hand()}
              isActive={activeTool() === "hand"}
              onClick={() => setActiveTool("hand")}
              letterShortcut="h"
            />

            {/* Main tools with shortcuts */}
            <For each={TOOL_CONFIG.slice(1)}>
              {({ tool, shortcut, letterShortcut }) => (
                <ToolButton
                  icon={TOOL_ICONS[tool]()}
                  shortcut={shortcut}
                  letterShortcut={letterShortcut}
                  isActive={activeTool() === tool}
                  onClick={() => handleToolClick(tool)}
                />
              )}
            </For>
          </div>
        </Show>

        {/* Sidebar toggle - always visible */}
        <button
          type="button"
          onClick={() => {
            setStore("sidebarVisible", (v) => !v);
          }}
          class="relative flex h-7 w-full items-center justify-center text-muted-foreground hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
          classList={{ "bg-amber-500/20 text-amber-700 dark:text-amber-400": !store.sidebarVisible }}
        >
          <PanelLeft size={14} />
          <span
            class={`absolute bottom-0 left-px text-[7px] font-mono font-medium ${
              !store.sidebarVisible
                ? "text-amber-600 dark:text-amber-500"
                : "text-stone-400 dark:text-stone-500"
            }`}
          >
            {isMac ? "⌘b" : "^b"}
          </span>
        </button>
      </div>

      {/* Help text for panning */}
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
