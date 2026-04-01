import Konva from "konva";
import { GroupPlugin, Shape2dPlugin, type IPluginContext } from "../../src/plugins";

/**
 * Scene 01: outer group with grouped children and one extra shape
 *
 * Initial canvas layout in world space:
 *
 * +------------------------------------------------+
 * | g1                                             |
 * |  +----------+                                  |
 * |  | s1 red   |  +-----------+                   |
 * |  +----------+  | s2 blue   |                   |
 * |                +-----------+                   |
 * +------------------------------------------------+
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

export function initializeScene01SelectOuterGroupFromChild(args: {
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
    y: 108,
    rotation: -10,
    w: 88,
    h: 156,
    backgroundColor: "orange",
  });

  [s1, s2, s3].forEach((shape) => {
    Shape2dPlugin.setupShapeListeners(args.context, shape);
    shape.setDraggable(true);
  });

  const g1 = GroupPlugin.group(args.context, [s1, s2]);
  args.groupPlugin.setupGroupListeners(args.context, g1);

  return { s1, s2, s3, g1 } satisfies {
    s1: Konva.Rect;
    s2: Konva.Rect;
    s3: Konva.Rect;
    g1: Konva.Group;
  };
}
