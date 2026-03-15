import type { IPlugin, IPluginContext } from "./interface";
import { Shape2dPlugin } from "./Shape2d.plugin";


export class ExampleScenePlugin implements IPlugin {

  constructor() {
  }

  apply(context: IPluginContext): void {

    const s1 = Shape2dPlugin.createPreviewRect({ x: 60, y: 60, w: 100, h: 90, fill: 'red' });
    const s2 = Shape2dPlugin.createPreviewRect({ x: 220, y: 140, w: 100, h: 90, fill: 'blue' });

    Shape2dPlugin.syncShape(s1, context);
    Shape2dPlugin.syncShape(s2, context);


  }


}
