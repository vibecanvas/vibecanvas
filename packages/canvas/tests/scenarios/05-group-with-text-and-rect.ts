import type { IPluginContext } from "../../src/plugins/interface";
import { GroupPlugin } from "../../src/plugins/Group.plugin";
import { Shape2dPlugin } from "../../src/plugins/Shape2d.plugin";
import { TextPlugin } from "../../src/plugins/Text.plugin";

/**
 * Scene 05: a group g that contains a text node t and a rect r.
 *
 * Used to verify group-drilling behaviour on text nodes:
 * - single click on t → g selected
 * - dblclick on t (while g selected) → t selected, NOT edit mode
 * - dblclick on t (while t selected) → edit mode
 *
 * Layout:
 *   +------------------------------+
 *   | g                            |
 *   |  [t: "Hello"]  [r: coral]   |
 *   +------------------------------+
 */
export function initializeScene05GroupWithTextAndRect(args: {
  context: IPluginContext;
  groupPlugin: GroupPlugin;
}) {
  const now = Date.now();

  const text = TextPlugin.createTextNode({
    id: "t1",
    x: 100,
    y: 150,
    rotation: 0,
    bindings: [],
    createdAt: now,
    locked: false,
    parentGroupId: null,
    updatedAt: now,
    zIndex: "",
    style: {},
    data: {
      type: "text",
      w: 150,
      h: 30,
      text: "Hello",
      originalText: "Hello",
      fontSize: 16,
      fontFamily: "Arial",
      textAlign: "left",
      verticalAlign: "top",
      lineHeight: 1.2,
      link: null,
      containerId: null,
      autoResize: false,
    },
  });
  TextPlugin.setupShapeListeners(args.context, text);
  text.draggable(true);
  args.context.staticForegroundLayer.add(text);

  const rect = Shape2dPlugin.createRectFromElement({
    id: "r1",
    x: 300,
    y: 150,
    rotation: 0,
    bindings: [],
    createdAt: now,
    locked: false,
    parentGroupId: null,
    updatedAt: now,
    zIndex: "",
    data: { type: "rect", w: 100, h: 60 },
    style: { backgroundColor: "coral" },
  });
  Shape2dPlugin.setupShapeListeners(args.context, rect);
  rect.draggable(true);
  args.context.staticForegroundLayer.add(rect);

  const group = GroupPlugin.group(args.context, [text, rect]);
  args.groupPlugin.setupGroupListeners(args.context, group);

  return { group, text, rect };
}
