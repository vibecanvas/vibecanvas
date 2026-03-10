/**
 * Toolbar Types
 * Type definitions for the floating drawing toolbar
 */

export type Tool =
  | "hand"
  | "select"
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "arrow"
  | "line"
  | "pen"
  | "text"
  | "image"
  | "chat"
  | "filesystem"
  | "terminal";

export interface ToolDefinition {
  tool: Tool;
  shortcut?: string;
}

/** Maps keyboard shortcut keys to tools */
export const TOOL_SHORTCUTS: Record<string, Tool> = {
  // Number shortcuts
  "1": "select",
  "2": "rectangle",
  "3": "diamond",
  "4": "ellipse",
  "5": "arrow",
  "6": "line",
  "7": "pen",
  "8": "text",
  "9": "image",
  // Letter shortcuts
  "h": "hand",
  "r": "rectangle",
  "d": "diamond",
  "o": "ellipse",
  "a": "arrow",
  "l": "line",
  "p": "pen",
  "t": "text",
  "c": "chat",
  "f": "filesystem",
  "j": "terminal",
  "Escape": "select",
} as const;

/** Ordered list of tools with their shortcuts */
export const TOOLS: ToolDefinition[] = [
  { tool: "hand" },
  { tool: "select", shortcut: "1" },
  { tool: "rectangle", shortcut: "2" },
  { tool: "diamond", shortcut: "3" },
  { tool: "ellipse", shortcut: "4" },
  { tool: "arrow", shortcut: "5" },
  { tool: "line", shortcut: "6" },
  { tool: "pen", shortcut: "7" },
  { tool: "text", shortcut: "8" },
  { tool: "image", shortcut: "9" },
  { tool: "chat" },
  { tool: "filesystem" },
  { tool: "terminal" },
];
