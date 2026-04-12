import ArrowRight from "lucide-solid/icons/arrow-right";
import "./styles.css";
import Circle from "lucide-solid/icons/circle";
import Diamond from "lucide-solid/icons/diamond";
import Grid2x2 from "lucide-solid/icons/grid-2x2";
import Hand from "lucide-solid/icons/hand";
import Image from "lucide-solid/icons/image";
import Minus from "lucide-solid/icons/minus";
import MousePointer2 from "lucide-solid/icons/mouse-pointer-2";
import Pencil from "lucide-solid/icons/pencil";
import Square from "lucide-solid/icons/square";
import Type from "lucide-solid/icons/type";
import type { Accessor } from "solid-js";
import { For, createSignal } from "solid-js";
import { ToolButton } from "./ToolButton";

export type TRuntimeToolbarTool = {
  id: string;
  label: string;
  icon?: string;
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

  if (toolId === "rectangle") {
    return <Square size={14} />;
  }

  if (toolId === "diamond") {
    return <Diamond size={14} />;
  }

  if (toolId === "ellipse") {
    return <Circle size={14} />;
  }

  if (toolId === "arrow") {
    return <ArrowRight size={14} />;
  }

  if (toolId === "line") {
    return <Minus size={14} />;
  }

  if (toolId === "pen") {
    return <Pencil size={14} />;
  }

  if (toolId === "image") {
    return <Image size={14} />;
  }

  if (toolId === "text") {
    return <Type size={14} />;
  }

  return <span class="vc-runtime-toolbar-fallback-label">{toolId.slice(0, 2)}</span>;
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
    <div class="vc-canvas-toolbar-anchor">
      <div class="vc-runtime-toolbar-panel">
        <button
          type="button"
          onClick={() => setIsCollapsed((value) => !value)}
          class="vc-runtime-toolbar-collapse"
        >
          TOOLS
        </button>
        {isCollapsed() ? null : (
          <div class="vc-runtime-toolbar-list">
            <For each={props.tools()}>
              {(tool) => {
                const shortcutParts = getShortcutParts(tool.shortcuts);
                return (
                  <ToolButton
                    icon={getToolIcon(tool.icon ?? tool.id)}
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

      <div class="vc-runtime-toolbar-hints">
        <div class="vc-runtime-toolbar-hint">
          <kbd class="vc-runtime-toolbar-keycap">Middle</kbd>
          <span>Pan</span>
        </div>
        <div class="vc-runtime-toolbar-hint">
          <kbd class="vc-runtime-toolbar-keycap">Space</kbd>
          <span>Drag</span>
        </div>
      </div>
    </div>
  );
}
