import Konva from "konva";
import { createEffect } from "solid-js";
import type { IPlugin, IPluginContext } from "./interface";

/**
 * Handles rotation and resizing
 */
export class TransformPlugin implements IPlugin {
  #transformer: Konva.Transformer;

  constructor() {
    this.#transformer = new Konva.Transformer({
    });

  }

  apply(context: IPluginContext): void {
    context.hooks.init.tap(() => {
      // this.#transformer.on('dragmove', console.log)
      context.dynamicLayer.add(this.#transformer);
      this.createReaction(context)
      // this.setupHistory(context)
    })
  }

  private setupHistory(context: IPluginContext) {
    this.#transformer.on('transformstart', e => {
      console.log('transformstart', e)
      if (e.currentTarget instanceof Konva.Transformer) {

        console.log(e.currentTarget.getNodes())
        e.currentTarget.getNodes().forEach(node => {
          if (node instanceof Konva.Group) {
            const ogRotation = node.rotation()
            const ogX = node.x()
            const ogY = node.y()
            const ogWidth = node.width()
            const ogHeight = node.height()
            setTimeout(() => {
              node.rotation(ogRotation)
              node.x(ogX)
              node.y(ogY)
              node.width(ogWidth)
              node.height(ogHeight)
            }, 1000)
          }
        })

      }
    })
    this.#transformer.on('transformend', e => {
      console.log('transformend', e)
    })
    this.#transformer.on('transform', e => {
      console.log('transform', e)
    })


  }

  private createReaction(context: IPluginContext) {
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
  static filterSelection(selection: (Konva.Group | Konva.Shape)[]) {
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
