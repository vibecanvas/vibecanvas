// Keep help examples in sync with these executable tests:
// - apps/cli/tests/plugins/cli/cmds/cmd.add.examples.change.test.ts
// - apps/cli/tests/plugins/cli/cmds/cmd.patch.examples.change.test.ts

const CANVAS_ADD_EXAMPLE_INLINE_RECT_PAYLOAD = {
  type: 'rect',
  x: 40,
  y: 20,
  data: { w: 160, h: 90 },
};

const CANVAS_ADD_EXAMPLE_INLINE_TEXT_PAYLOAD = {
  type: 'text',
  x: 240,
  y: 32,
  data: { text: 'hello', originalText: 'hello', w: 120, h: 40 },
};

const CANVAS_ADD_EXAMPLE_INLINE_MINIMAL_RECT_PAYLOAD = {
  type: 'rect',
};

const CANVAS_ADD_EXAMPLE_INLINE_MINIMAL_TEXT_PAYLOAD = {
  type: 'text',
};

const CANVAS_ADD_EXAMPLE_FILE_PAYLOAD = [
  { type: 'rect', x: 20, y: 20, data: { w: 140, h: 80 } },
  { type: 'arrow', x: 160, y: 60, data: { points: [[0, 0], [100, 0]] } },
];

const CANVAS_PATCH_EXAMPLE_MOVE_ELEMENT_PAYLOAD = {
  element: { x: 55 },
};

const CANVAS_PATCH_EXAMPLE_STYLE_ELEMENT_PAYLOAD = {
  element: { style: { backgroundColor: '#ff0000' } },
};

const CANVAS_PATCH_EXAMPLE_GROUP_PAYLOAD = {
  group: { locked: true },
};

function stringifyExample(value: unknown): string {
  return JSON.stringify(value);
}

const CANVAS_ADD_HELP_EXAMPLES = {
  inlineRect: `vibecanvas add --canvas <canvas-id> --element '${stringifyExample(CANVAS_ADD_EXAMPLE_INLINE_RECT_PAYLOAD)}' --json`,
  inlineText: `vibecanvas add --canvas <canvas-id> --element '${stringifyExample(CANVAS_ADD_EXAMPLE_INLINE_TEXT_PAYLOAD)}' --json`,
  inlineMinimalRect: `vibecanvas add --canvas <canvas-id> --element '${stringifyExample(CANVAS_ADD_EXAMPLE_INLINE_MINIMAL_RECT_PAYLOAD)}' --json`,
  inlineMinimalText: `vibecanvas add --canvas <canvas-id> --element '${stringifyExample(CANVAS_ADD_EXAMPLE_INLINE_MINIMAL_TEXT_PAYLOAD)}' --json`,
  elementsFile: 'vibecanvas add --canvas <canvas-id> --elements-file ./elements.json --json',
  shorthandRect: 'vibecanvas add --canvas <canvas-id> --rect 40,20,160,90 --json',
  shorthandText: 'vibecanvas add --canvas <canvas-id> --text 240,32,hello --json',
};

const CANVAS_PATCH_HELP_EXAMPLES = {
  moveElement: `vibecanvas patch --canvas <canvas-id> --id <element-id> --patch '${stringifyExample(CANVAS_PATCH_EXAMPLE_MOVE_ELEMENT_PAYLOAD)}' --json`,
  styleElement: `vibecanvas patch --canvas <canvas-id> --id <element-id> --patch '${stringifyExample(CANVAS_PATCH_EXAMPLE_STYLE_ELEMENT_PAYLOAD)}' --json`,
  lockGroup: `vibecanvas patch --canvas <canvas-id> --id <group-id> --patch '${stringifyExample(CANVAS_PATCH_EXAMPLE_GROUP_PAYLOAD)}' --json`,
};

export {
  CANVAS_ADD_EXAMPLE_FILE_PAYLOAD,
  CANVAS_ADD_EXAMPLE_INLINE_MINIMAL_RECT_PAYLOAD,
  CANVAS_ADD_EXAMPLE_INLINE_MINIMAL_TEXT_PAYLOAD,
  CANVAS_ADD_EXAMPLE_INLINE_RECT_PAYLOAD,
  CANVAS_ADD_EXAMPLE_INLINE_TEXT_PAYLOAD,
  CANVAS_ADD_HELP_EXAMPLES,
  CANVAS_PATCH_EXAMPLE_GROUP_PAYLOAD,
  CANVAS_PATCH_EXAMPLE_MOVE_ELEMENT_PAYLOAD,
  CANVAS_PATCH_EXAMPLE_STYLE_ELEMENT_PAYLOAD,
  CANVAS_PATCH_HELP_EXAMPLES,
};
