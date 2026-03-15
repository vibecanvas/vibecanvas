import type { IPlugin, IPluginContext } from "./interface";
import { Shape2dPlugin } from "./Shape2d.plugin";


export class ExampleScenePlugin implements IPlugin {

  constructor() {
  }

  apply(context: IPluginContext): void {

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

    Shape2dPlugin.setupShapeListeners(s1, context);
    Shape2dPlugin.setupShapeListeners(s2, context);
    s1.setDraggable(true)
    s2.setDraggable(true)


  }


}
