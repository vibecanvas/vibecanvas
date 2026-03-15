import Konva from "konva";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import { createEffect } from "solid-js";
import { produce } from "solid-js/store";
import { Shape2dPlugin } from "./Shape2d.plugin";


export class ExampleScenePlugin implements IPlugin {

  constructor() {
  }

  apply(context: IPluginContext): void {

    Shape2dPlugin.createRect(context, { x: 60, y: 60, w: 100, h: 90, fill: 'red' });
    Shape2dPlugin.createRect(context, { x: 220, y: 140, w: 100, h: 90, fill: 'blue' });


  }


}
