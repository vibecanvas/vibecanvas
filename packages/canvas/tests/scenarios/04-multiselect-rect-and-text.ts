import Konva from "konva";
import type { IPluginContext } from "../../src/plugins/interface";
import { Shape2dPlugin } from "../../src/plugins/Shape2d.plugin";
import { TextPlugin } from "../../src/plugins/Text.plugin";

/**
 * Scene 04: one rect + one text node, both at top level.
 * Used to verify multi-select transformer anchors and keepRatio behaviour.
 *
 * Initial canvas layout in world space:
 *
 * +------------------------------------------------------+
 * |  +-----------+                                       |
 * |  | rect (r1) |    "Hello world"                      |
 * |  +-----------+      (text t1)                        |
 * +------------------------------------------------------+
 */
export function initializeScene04MultiselectRectAndText(args: { context: IPluginContext }) {
  const now = Date.now();

  const rect = Shape2dPlugin.createRectFromElement({
    id: "r1",
    x: 100,
    y: 100,
    rotation: 0,
    bindings: [],
    createdAt: now,
    locked: false,
    parentGroupId: null,
    updatedAt: now,
    zIndex: "",
    data: { type: "rect", w: 120, h: 80 },
    style: { backgroundColor: "coral" },
  });
  Shape2dPlugin.setupShapeListeners(args.context, rect);
  rect.draggable(true);
  args.context.staticForegroundLayer.add(rect);

  const text = TextPlugin.createTextNode({
    id: "t1",
    x: 300,
    y: 110,
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
      w: 180,
      h: 40,
      text: "Hello world",
      originalText: "Hello world",
      fontSize: 20,
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

  return { rect, text } satisfies { rect: Konva.Rect; text: Konva.Text };
}
