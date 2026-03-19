import Konva from "konva";
import { createEffect } from "solid-js";
import type { IPlugin, IPluginContext } from "./interface";
import { TElement } from "@vibecanvas/shell/automerge/index";

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
      this.setupHistory(context)
    })
  }

  private setupHistory(context: IPluginContext) {
    let originalElements: TElement[] = []
    const refreshTransformer = () => {
      if (typeof this.#transformer.forceUpdate === 'function') {
        this.#transformer.forceUpdate()
      }
      this.#transformer.update()
    }

    this.#transformer.on('transformstart', e => {
      const shapes = TransformPlugin.getShapesFromTransformer(this.#transformer.getNodes())
      originalElements = shapes.map(shape => context.capabilities.toElement?.(shape)).filter(Boolean) as TElement[]
    })
    this.#transformer.on('transformend', e => {
      console.log('transformend', e)
      const shapes = TransformPlugin.getShapesFromTransformer(this.#transformer.getNodes())
      const elements = shapes.map(shape => context.capabilities.toElement?.(shape)).filter(Boolean) as TElement[]
      TransformPlugin.refreshSelectedGroups(context)
      refreshTransformer()
      const beforeElements = structuredClone(originalElements)
      const afterElements = structuredClone(elements)
      context.crdt.patch({ elements: afterElements, groups: [] })
      context.history.record({
        undo() {
          TransformPlugin.applyElementsToShapes(context, beforeElements)
          refreshTransformer()
          context.crdt.patch({ elements: beforeElements, groups: [] })
        }, redo() {
          TransformPlugin.applyElementsToShapes(context, afterElements)
          refreshTransformer()
          context.crdt.patch({ elements, groups: [] })
        },
      })
    })
    this.#transformer.on('transform', e => {
      // 
    })


  }

  private static getShapesFromTransformer(nodes: Konva.Node[]): Konva.Shape[] {
    return nodes.map(node => {
      if (node instanceof Konva.Group && node.hasChildren()) return TransformPlugin.getShapesFromTransformer(node.getChildren())
      if (node instanceof Konva.Shape) return node
      return []
    }).flat()
  }

  private static applyElementsToShapes(context: IPluginContext, elements: TElement[]) {
    elements.forEach(element => {
      context.capabilities.updateShapeFromTElement?.(element)
    })
    TransformPlugin.refreshGroupsForElements(context, elements)
  }

  private static refreshSelectedGroups(context: IPluginContext) {
    context.state.selection.forEach(node => {
      if (node instanceof Konva.Group) {
        node.fire('transform')
      }
    })
  }

  private static refreshGroupsForElements(context: IPluginContext, elements: TElement[]) {
    const refreshedGroups = new Set<string>()

    elements.forEach(element => {
      const shape = context.staticForegroundLayer.findOne((node: Konva.Node) => node.id() === element.id)
      let parent = shape?.getParent()

      while (parent instanceof Konva.Group) {
        if (!refreshedGroups.has(parent.id())) {
          parent.fire('transform')
          refreshedGroups.add(parent.id())
        }
        parent = parent.getParent()
      }
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
