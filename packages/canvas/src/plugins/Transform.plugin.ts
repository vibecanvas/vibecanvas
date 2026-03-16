import Konva from "konva";
import { CanvasMode } from "../services/canvas/enum";
import type { IPlugin, IPluginContext } from "./interface";
import { createEffect } from "solid-js";


export class TransformPlugin implements IPlugin {
  #transformer: Konva.Transformer;

  constructor() {
    this.#transformer = new Konva.Transformer({
    });

    this.#transformer.on('pointerclick pointerdown', e => {
      e.cancelBubble = true
    })

  }

  apply(context: IPluginContext): void {
    context.dynamicLayer.add(this.#transformer);
    createEffect(() => {
      if (context.state.selection.length === 1 && context.state.selection[0] instanceof Konva.Group) {
        this.#transformer.borderEnabled(false)
      } else if (context.state.selection.length > 1) {
        this.#transformer.borderEnabled(true)
        this.#transformer.borderDash([2, 2])
      } else if (context.state.selection.length === 1) {
        this.#transformer.borderEnabled(true)
        this.#transformer.borderDash([0, 0])
      }
      this.#transformer.setNodes(TransformPlugin.filterSelection(context.state.selection))
      this.#transformer.update()
    })
  }


  /**
   * context.state.selection includes groups and subgroups when dbl clicked
   * E.g. dbl click on rect in group => [group, rect]
   * This is needed to show boundary box on group but transformer should
   * only render over rect
   * @param selection 
   * @returns selection
   */
  private static filterSelection(selection: (Konva.Group | Konva.Shape)[]) {
    let subGroup = selection.find(sel => sel.parent instanceof Konva.Group)
    if (!subGroup) return selection

    const findDeepestSubGroup = (selection: (Konva.Group | Konva.Shape)[]) => {
      const deeperSubGroup = selection.find(sel => sel.parent === subGroup)
      if (!deeperSubGroup) return
      subGroup = deeperSubGroup
      return findDeepestSubGroup(selection)
    }

    findDeepestSubGroup(selection)

    return [subGroup]

  }


}
