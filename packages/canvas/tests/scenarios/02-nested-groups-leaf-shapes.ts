import Konva from "konva";
import { GroupPlugin, Shape2dPlugin, type IPluginContext } from "../../src/plugins";

/**
 * Scene 02: nested groups with leaf shapes
 *
 * Initial canvas layout in world space:
 *
 * +------------------------------------------------------+
 * | g1                                                   |
 * |  +-----------------------------------------------+   |
 * |  | g2                                            |   |
 * |  |  +----------+   +-----------+                 |   |
 * |  |  | s1 red   |   | s2 blue   |                 |   |
 * |  |  +----------+   +-----------+                 |   |
 * |  +-----------------------------------------------+   |
 * |                                      +-----------+   |
 * |                                      | s3 gold   |   |
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

export function initializeScene02NestedGroupsLeafShapes(args: {
  context: IPluginContext;
  groupPlugin: GroupPlugin;
}) {
  const s1 = createRect({
    id: "1",
    x: 82,
    y: 96,
    rotation: -6,
    w: 96,
    h: 84,
    backgroundColor: "red",
  });
  const s2 = createRect({
    id: "2",
    x: 194,
    y: 118,
    rotation: 4,
    w: 132,
    h: 104,
    backgroundColor: "blue",
  });
  const s3 = createRect({
    id: "3",
    x: 354,
    y: 148,
    rotation: -3,
    w: 112,
    h: 136,
    backgroundColor: "gold",
  });

  [s1, s2, s3].forEach((shape) => {
    Shape2dPlugin.setupShapeListeners(args.context, shape);
    shape.setDraggable(true);
  });

  const g2 = GroupPlugin.group(args.context, [s1, s2]);
  args.groupPlugin.setupGroupListeners(args.context, g2);

  const g1 = GroupPlugin.group(args.context, [g2, s3]);
  args.groupPlugin.setupGroupListeners(args.context, g1);

  return { s1, s2, s3, g1, g2 } satisfies {
    s1: Konva.Rect;
    s2: Konva.Rect;
    s3: Konva.Rect;
    g1: Konva.Group;
    g2: Konva.Group;
  };
}
