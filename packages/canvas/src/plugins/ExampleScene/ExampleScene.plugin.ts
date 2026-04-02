import Konva from "konva";
import type { IPlugin, IPluginContext } from "../shared/interface";
import { Shape2dPlugin } from "../Shape2d/Shape2d.plugin";
import { GroupPlugin } from "../Group/Group.plugin";


export class ExampleScenePlugin implements IPlugin {
  #groupPlugin: GroupPlugin;

  constructor(groupPlugin: GroupPlugin) {
    this.#groupPlugin = groupPlugin;
  }

  apply(context: IPluginContext): void {
    ExampleScenePlugin.scene2(this.#groupPlugin, context, ExampleScenePlugin.createShapes(6))
  }

  static createShapes(n: number) {
    const colors = ['red', 'blue', 'orange', 'green', 'gold', 'teal']
    const widths = [96, 132, 88, 148, 112, 124]
    const heights = [84, 104, 156, 92, 136, 76]
    const rotations = [-6, 4, -10, 7, -3, 11]
    const positions = [
      { x: 82, y: 96 },
      { x: 194, y: 118 },
      { x: 354, y: 108 },
      { x: 458, y: 136 },
      { x: 128, y: 232 },
      { x: 566, y: 194 },
    ]

    return Array.from({ length: n }, (_, index) => {
      const now = Date.now()
      const position = positions[index % positions.length]

      return Shape2dPlugin.createRectFromElement({
        id: String(index + 1),
        x: position.x,
        y: position.y,
        rotation: rotations[index % rotations.length],
        bindings: [],
        createdAt: now,
        locked: false,
        parentGroupId: null,
        updatedAt: now,
        zIndex: '',
        data: {
          type: 'rect',
          w: widths[index % widths.length],
          h: heights[index % heights.length],
        },
        style: {
          backgroundColor: colors[index % colors.length],
        },
      })
    })
  }

  static scene1(groupPlugin: GroupPlugin, context: IPluginContext, shapes: Konva.Rect[]) {
    const [s1, s2, s3] = shapes
    if (!s1 || !s2 || !s3) return

      ;[s1, s2, s3].forEach(shape => {
        Shape2dPlugin.setupShapeListeners(context, shape)
        shape.setDraggable(true)
      })

    const g1 = GroupPlugin.group(context, [s1, s2])
    groupPlugin.setupGroupListeners(context, g1)
  }

  static scene2(groupPlugin: GroupPlugin, context: IPluginContext, shapes: Konva.Rect[]) {
    const [s1, s2, s3, s4, s5, s6] = shapes
    if (!s1 || !s2 || !s3 || !s4 || !s5 || !s6) return

      ;[s1, s2, s3, s4, s5, s6].forEach(shape => {
        Shape2dPlugin.setupShapeListeners(context, shape)
        shape.setDraggable(true)
      })

    const g1 = GroupPlugin.group(context, [s1, s2])
    groupPlugin.setupGroupListeners(context, g1)

    const g2 = GroupPlugin.group(context, [s3, s4])
    groupPlugin.setupGroupListeners(context, g2)

    const g3 = GroupPlugin.group(context, [g1, s5])
    groupPlugin.setupGroupListeners(context, g3)
  }
}
