export type THelpShortcutItem = {
  label: string;
  keys?: string[];
  note?: string;
};

export type THelpSection = {
  title: string;
  items: THelpShortcutItem[];
};

export const HELP_SECTIONS: THelpSection[] = [
  {
    title: "Tools",
    items: [
      { label: "Hand", keys: ["H"] },
      { label: "Select", keys: ["1"], note: "Esc also returns to select" },
      { label: "Rectangle", keys: ["2", "R"] },
      { label: "Diamond", keys: ["3", "D"] },
      { label: "Ellipse", keys: ["4", "O"] },
      { label: "Arrow", keys: ["5", "A"] },
      { label: "Line", keys: ["6", "L"] },
      { label: "Pen", keys: ["7", "P"] },
      { label: "Text", keys: ["8", "T"] },
      { label: "Image", keys: ["9"] },
      { label: "Chat", keys: ["C"] },
      { label: "Filesystem", keys: ["F"] },
      { label: "Terminal", keys: ["J"] },
    ],
  },
  {
    title: "Canvas",
    items: [
      { label: "Pan viewport", keys: ["Wheel"] },
      { label: "Zoom at pointer", keys: ["Ctrl", "Wheel"] },
      { label: "Temporary hand tool", keys: ["Space"] },
      { label: "Toggle grid", keys: ["G"] },
      { label: "Toggle sidebar", keys: ["Cmd/Ctrl", "B"] },
      { label: "Open help", keys: ["?"] },
    ],
  },
  {
    title: "Selection And History",
    items: [
      { label: "Marquee select", note: "Drag on empty canvas" },
      { label: "Add or remove selection", keys: ["Shift", "Click"] },
      { label: "Drill into nested groups", note: "Double click selected group content" },
      { label: "Group selection", keys: ["Cmd/Ctrl", "G"] },
      { label: "Ungroup selection", keys: ["Cmd/Ctrl", "Shift", "G"] },
      { label: "Duplicate by drag", keys: ["Alt", "Drag"] },
      { label: "Undo", keys: ["Cmd/Ctrl", "Z"] },
      { label: "Redo", keys: ["Cmd/Ctrl", "Shift", "Z"] },
    ],
  },
];

export const HELP_CALLOUT =
  "Tools shown here reflect the current toolbar. Rectangle, selection, grouping, and history are the most complete workflows today.";
