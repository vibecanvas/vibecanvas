import Konva from "konva";
import type { IPluginContext } from "../../src/plugins/interface";
import { GroupPlugin } from "../../src/plugins/Group.plugin";
import { Shape2dPlugin } from "../../src/plugins/Shape2d.plugin";

/**
 * Scene 03: top-level groups and top-level shape
 *
 * Initial canvas layout in world space:
 *
 * +------------------------------------------------------+
 * | +------------------+    +------------------+         |
 * | | g1               |    | g2               |         |
 * | |  +----------+    |    |  +-----------+   |         |
 * | |  | s1 red   |    |    |  | s3 blue   |   |         |
 * | |  +----------+    |    |  +-----------+   |         |
 * | +------------------+    +------------------+         |
 * |                                      +-----------+   |
 * |                                      | s4 gold   |   |
 * |                                      +-----------+   |
 * +------------------------------------------------------+
 */

function createRect(args: {
  id: string;
  x: number;
  y: number;
  rotation: number;
  w: number;
  h: number;
  backgroundColor: string;
}) {
  const now = Date.now();

  return Shape2dPlugin.createRectFromElement({
    id: args.id,
    x: args.x,
    y: args.y,
    rotation: args.rotation,
    bindings: [],
    createdAt: now,
    locked: false,
    parentGroupId: null,
    updatedAt: now,
    zIndex: "",
    data: {
      type: "rect",
      w: args.w,
      h: args.h,
    },
    style: {
      backgroundColor: args.backgroundColor,
    },
  });
}

export function initializeScene03TopLevelMixedSelection(args: {
  context: IPluginContext;
  groupPlugin: GroupPlugin;
}) {
  const s1 = createRect({ id: "1", x: 82, y: 96, rotation: -6, w: 96, h: 84, backgroundColor: "red" });
  const s2 = createRect({ id: "2", x: 194, y: 118, rotation: 4, w: 132, h: 104, backgroundColor: "orange" });
  const s3 = createRect({ id: "3", x: 354, y: 108, rotation: -10, w: 88, h: 156, backgroundColor: "blue" });
  const s4 = createRect({ id: "4", x: 566, y: 194, rotation: 11, w: 124, h: 76, backgroundColor: "gold" });

  [s1, s2, s3, s4].forEach((shape) => {
    Shape2dPlugin.setupShapeListeners(args.context, shape);
    shape.setDraggable(true);
  });

  const g1 = GroupPlugin.group(args.context, [s1, s2]);
  args.groupPlugin.setupGroupListeners(args.context, g1);

  const g2 = GroupPlugin.group(args.context, [s3]);
  args.groupPlugin.setupGroupListeners(args.context, g2);

  args.context.staticForegroundLayer.add(s4);

  return { g1, g2, s4 } satisfies {
    g1: Konva.Group;
    g2: Konva.Group;
    s4: Konva.Rect;
  };
}
