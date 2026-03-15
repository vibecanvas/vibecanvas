import Konva from "konva";
import type { IPlugin, IPluginContext } from "./interface";
import { Shape2dPlugin } from "./Shape2d.plugin";
import { GroupPlugin } from "./Group.plugin";


export class ExampleScenePlugin implements IPlugin {
  #groupPlugin: GroupPlugin;
  constructor(groupPlugin: GroupPlugin) {
    this.#groupPlugin = groupPlugin;
  }

  apply(context: IPluginContext): void {


    const { s1, s2, s3 } = this.createShapes()

    Shape2dPlugin.setupShapeListeners(s1, context);
    Shape2dPlugin.setupShapeListeners(s2, context);
    Shape2dPlugin.setupShapeListeners(s3, context);

    s1.setDraggable(true)
    s2.setDraggable(true)
    s3.setDraggable(true)

    const g1 = GroupPlugin.group(context, [s1, s2])
    this.#groupPlugin.setupGroupListeners(context, g1)
    context.staticForegroundLayer.add(s3)





  }

  private createShapes() {

    const s1 = Shape2dPlugin.createPreviewRect({
      id: '1',
      x: 60,
      y: 60,
      angle: 0,
      bindings: [],
      createdAt: Date.now(),
      locked: false,
      parentGroupId: null,
      updatedAt: Date.now(),
      zIndex: '',
      data: {
        type: 'rect',
        w: 100,
        h: 90,
      },
      style: {
        backgroundColor: 'red'
      }
    });
    const s2 = Shape2dPlugin.createPreviewRect({
      id: '2',
      x: 220,
      y: 140,
      angle: 0,
      bindings: [],
      createdAt: Date.now(),
      locked: false,
      parentGroupId: null,
      updatedAt: Date.now(),
      zIndex: '',
      data: {
        type: 'rect',
        w: 100,
        h: 90,
      },
      style: {
        backgroundColor: 'blue'
      }
    });

    const s3 = Shape2dPlugin.createPreviewRect({
      id: '3',
      x: 320,
      y: 240,
      angle: 0,
      bindings: [],
      createdAt: Date.now(),
      locked: false,
      parentGroupId: null,
      updatedAt: Date.now(),
      zIndex: '',
      data: {
        type: 'rect',
        w: 100,
        h: 200,
      },
      style: {
        backgroundColor: 'orange'
      }
    });

    return { s1, s2, s3 }

  }


}
