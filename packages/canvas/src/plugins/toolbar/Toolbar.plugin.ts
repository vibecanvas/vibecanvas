import type { IPlugin } from "@vibecanvas/runtime";
import Hand from "lucide-static/icons/hand.svg?raw";
import MousePointer2 from "lucide-static/icons/mouse-pointer-2.svg?raw";
import { createComponent } from "solid-js";
import { render } from "solid-js/web";
import { RuntimeToolbar } from "../../components/FloatingCanvasToolbar/RuntimeToolbar";
import type { SceneService } from "../../services/scene/SceneService";
import type { SelectionService } from "../../services/selection/SelectionService";
import type { IRuntimeHooks } from "../../runtime";
import { CanvasMode } from "../../services/selection/CONSTANTS";
import type { EditorService, TEditorTool } from "src/services/editor/EditorService";

function getModeFromTool(tool: TEditorTool | undefined) {
  if (!tool) {
    return CanvasMode.SELECT;
  }

  if (tool.behavior.type !== "mode") {
    return CanvasMode.SELECT;
  }

  switch (tool.behavior.mode) {
    case "select":
      return CanvasMode.SELECT;
    case "hand":
      return CanvasMode.HAND;
    case "draw-create":
      return CanvasMode.DRAW_CREATE;
    case "click-create":
      return CanvasMode.CLICK_CREATE;
    default:
      return CanvasMode.SELECT;
  }
}

function fnNormalizeShortcut(shortcut: string) {
  return shortcut.trim().toLowerCase();
}

function txSyncCursor(render: SceneService, selection: SelectionService) {
  switch (selection.mode) {
    case CanvasMode.HAND:
      render.stage.container().style.cursor = "grab";
      return;
    case CanvasMode.DRAW_CREATE:
      render.stage.container().style.cursor = "crosshair";
      return;
    case CanvasMode.CLICK_CREATE:
      render.stage.container().style.cursor = "pointer";
      return;
    case CanvasMode.SELECT:
    default:
      render.stage.container().style.cursor = "default";
      return;
  }
}

function txSelectTool(editor: EditorService, toolId: string) {
  const tool = editor.getTool(toolId);
  if (!tool) {
    return false;
  }

  if (tool.behavior.type === "mode") {
    editor.setActiveTool(toolId);
    return true;
  }

  tool.onSelect?.();
  return true;
}

function fnGetShortcutToolId(editor: EditorService, event: KeyboardEvent) {
  if (event.altKey) {
    return null;
  }

  const prefix = [event.metaKey ? "meta" : "", event.ctrlKey ? "ctrl" : "", event.shiftKey ? "shift" : ""]
    .filter(Boolean)
    .join("+");
  const key = event.key === " " ? "space" : event.key;
  const normalizedKey = fnNormalizeShortcut(key);
  const candidate = prefix ? `${prefix}+${normalizedKey}` : normalizedKey;

  for (const tool of editor.getTools()) {
    for (const shortcut of tool.shortcuts ?? []) {
      if (fnNormalizeShortcut(shortcut) === candidate) {
        return tool.id;
      }
    }
  }

  return null;
}

function mountToolbar(args: {
  scene: SceneService;
  editor: EditorService;
  onToolSelect: (toolId: string) => void;
}) {
  const mountElement = document.createElement("div");
  mountElement.className = "absolute inset-0 pointer-events-none";
  args.scene.stage.container().appendChild(mountElement);

  const disposeRender = render(() => {
    return createComponent(RuntimeToolbar, {
      editor: args.editor,
      onToolSelect: args.onToolSelect,
    });
  }, mountElement);

  return {
    mountElement,
    dispose() {
      disposeRender();
      mountElement.remove();
    },
  };
}

/**
 * Registers base tools and renders toolbar UI from editor tool registry.
 * Toolbar should stay dumb and only reflect registered tool state.
 */
export function createToolbarPlugin(): IPlugin<{
  editor: EditorService;
  scene: SceneService;
  selection: SelectionService;
}, IRuntimeHooks> {
  let toolbarMount: ReturnType<typeof mountToolbar> | null = null;
  let toolBeforeSpaceHold: string | null = null;

  return {
    name: "toolbar",
    apply(ctx) {
      const editor = ctx.services.require("editor");
      const scene = ctx.services.require("scene");
      const selection = ctx.services.require("selection");

      editor.registerTool({
        id: "hand",
        label: "Hand",
        icon: Hand,
        shortcuts: ["h"],
        priority: 0,
        behavior: { type: "mode", mode: "hand" },
      });
      editor.registerTool({
        id: "select",
        label: "Select",
        icon: MousePointer2,
        shortcuts: ["1", "escape"],
        priority: 10,
        behavior: { type: "mode", mode: "select" },
      });

      selection.setMode(getModeFromTool(editor.getActiveTool()));

      ctx.hooks.init.tap(() => {
        toolbarMount = mountToolbar({
          scene,
          editor,
          onToolSelect: (toolId) => {
            txSelectTool(editor, toolId);
          },
        });
        txSyncCursor(scene, selection);
      });

      editor.hooks.activeToolChange.tap((toolId) => {
        selection.setMode(getModeFromTool(editor.getTool(toolId)));
        txSyncCursor(scene, selection);
        ctx.hooks.toolSelect.call(toolId);
      });

      ctx.hooks.keydown.tap((event) => {
        if (event.key === " ") {
          if (selection.selection.length > 0) {
            return false;
          }

          event.preventDefault();
          if (toolBeforeSpaceHold === null) {
            toolBeforeSpaceHold = editor.activeToolId;
            if (editor.activeToolId !== "hand") {
              txSelectTool(editor, "hand");
            }
          }
          return true;
        }

        const toolId = fnGetShortcutToolId(editor, event);
        if (!toolId) {
          return false;
        }

        if (toolId !== "hand") {
          selection.setSelection([]);
        }
        txSelectTool(editor, toolId);
        return true;
      });

      ctx.hooks.keyup.tap((event) => {
        if (event.key !== " ") {
          return false;
        }

        if (toolBeforeSpaceHold === null) {
          return false;
        }

        event.preventDefault();
        txSelectTool(editor, toolBeforeSpaceHold);
        toolBeforeSpaceHold = null;
        return true;
      });

      ctx.hooks.destroy.tap(() => {
        toolBeforeSpaceHold = null;
        editor.unregisterTool("hand");
        editor.unregisterTool("select");
        toolbarMount?.dispose();
        toolbarMount = null;
      });
    },
  };
}
