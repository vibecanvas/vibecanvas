import Konva from "konva";
import { createEffect } from "solid-js";
import type { IPlugin, IPluginContext } from "./interface";
import { TElement } from "@vibecanvas/shell/automerge/index";
import { PenPlugin } from "./Pen.plugin";

/**
 * Handles rotation and resizing
 */
export class TransformPlugin implements IPlugin {
  #transformer: Konva.Transformer;
  static readonly GROUP_ANCHORS = [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
  ] as const
  static readonly DEFAULT_ANCHORS = [
    'top-left',
    'top-center',
    'top-right',
    'middle-right',
    'middle-left',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ] as const

  constructor() {
    this.#transformer = new Konva.Transformer({
    });

  }

  apply(context: IPluginContext): void {
    context.hooks.init.tap(() => {
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
      const shapes = TransformPlugin.getSerializableShapes(context, this.#transformer.getNodes())
      originalElements = shapes.map(shape => context.capabilities.toElement?.(shape)).filter(Boolean) as TElement[]
    })
    this.#transformer.on('transformend', e => {
      const transformerNodes = this.#transformer.getNodes()
      const shapes = TransformPlugin.getSerializableShapes(context, transformerNodes)
      const elements = shapes.map(shape => context.capabilities.toElement?.(shape)).filter(Boolean) as TElement[]
      TransformPlugin.normalizeSelectedGroupTransforms(transformerNodes)
      TransformPlugin.applyElementsToShapes(context, elements)
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

  private static getSerializableShapes(context: IPluginContext, nodes: Konva.Node[]) {
    const shapes = TransformPlugin.getShapesFromTransformer(nodes)
    const byId = new Map(shapes.map(shape => [shape.id(), shape]))

    shapes.forEach(shape => {
      if (!(shape instanceof Konva.Rect)) return

      const attachedText = context.staticForegroundLayer.findOne((candidate: Konva.Node) => {
        return candidate instanceof Konva.Text && candidate.getAttr('vcContainerId') === shape.id()
      })

      if (attachedText instanceof Konva.Text) {
        byId.set(attachedText.id(), attachedText)
      }
    })

    return [...byId.values()]
  }

  private static normalizeSelectedGroupTransforms(nodes: Konva.Node[]) {
    nodes.forEach(node => {
      if (!(node instanceof Konva.Group)) return

      node.scale({ x: 1, y: 1 })
      node.rotation(0)
      node.skew({ x: 0, y: 0 })
    })
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
      const editingTextId = context.state.editingTextId
      if (editingTextId !== null) {
        this.#transformer.setNodes([])
        this.#transformer.update()
        return
      }

      const filteredSelection = TransformPlugin.filterSelection(context.state.selection)
      const isSingleGroupSelection = filteredSelection.length === 1 && filteredSelection[0] instanceof Konva.Group

      if (context.state.selection.length === 1 && context.state.selection[0] instanceof Konva.Group) {
        this.#transformer.borderEnabled(false)
      } else if (context.state.selection.length > 1) {
        this.#transformer.borderEnabled(true)
        this.#transformer.borderDash([2, 2])
      } else if (context.state.selection.length === 1) {
        this.#transformer.borderEnabled(true)
        this.#transformer.borderDash([0, 0])
      }

      const hasTextOnly = filteredSelection.length > 0 &&
        filteredSelection.every(n => n instanceof Konva.Text)
      const hasPenOnly = filteredSelection.length > 0 &&
        filteredSelection.every(n => PenPlugin.isPenNode(n))
      // Multi-select must use corner-only anchors with keepRatio to prevent skewing.
      // Single-shape selections keep free resize (all 8 anchors, no keepRatio),
      // except for groups, text-only selections, and pen paths which always lock ratio.
      const isMultiSelect = filteredSelection.length > 1
      const useCornerAnchors = isSingleGroupSelection || hasTextOnly || hasPenOnly || isMultiSelect
      this.#transformer.keepRatio(useCornerAnchors)
      this.#transformer.enabledAnchors(
        useCornerAnchors
          ? [...TransformPlugin.GROUP_ANCHORS]
          : [...TransformPlugin.DEFAULT_ANCHORS]
      )
      this.#transformer.setNodes(filteredSelection)
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
