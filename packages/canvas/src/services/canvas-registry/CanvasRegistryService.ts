import type { IService } from "@vibecanvas/runtime";
import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { ThemeService } from "@vibecanvas/service-theme";
import { SyncHook } from "@vibecanvas/tapable";
import type Konva from "konva";
import { fnMergeSelectionStyleMenuConfigs } from "./fn-merge-selection-style-menu-configs";
import { fnSortByPriority } from "./fn.sort-by-priority";
import { VC_NODE_KIND_ATTR } from "../../core/CONSTANTS";
import type { TCanvasNodeKind } from "../../core/fn.canvas-node-semantics";
import type {
  TCanvasNodeType, TCanvasRegistryElementDefinition, TCanvasRegistryGroupDefinition,
  TCanvasRegistryServiceHooks, TCanvasRegistryTransformOptions
} from "./types";
export * from "./types";

/**
 * Shared semantic registry for canvas elements and groups.
 *
 * Responsibilities:
 * - map runtime nodes <-> persisted elements/groups
 * - create runtime nodes from persisted elements/groups
 * - run layered element lifecycle hooks in priority order
 * - keep group registration single-owner and stable
 *
 * Element lifecycle model:
 * - base serialize: toElement
 * - serialize modifiers: afterToElement
 * - base create: createNode
 * - create modifiers: afterCreateNode
 * - runtime wiring: attachListeners
 * - persisted replay: updateElement
 */
export class CanvasRegistryService implements IService<TCanvasRegistryServiceHooks> {
  readonly name = "canvasRegistry";
  readonly hooks: TCanvasRegistryServiceHooks = {
    elementsChange: new SyncHook(),
    groupsChange: new SyncHook(),
  };

  private readonly elements: TCanvasRegistryElementDefinition[] = [];
  private readonly groups = new Map<string, TCanvasRegistryGroupDefinition>();

  registerElement(definition: TCanvasRegistryElementDefinition) {
    this.elements.push(definition);
    this.hooks.elementsChange.call();

    return () => {
      this.unregisterElement(definition.id);
    };
  }

  unregisterElement(id: string) {
    const index = this.elements.findIndex((definition) => definition.id === id);
    if (index < 0) {
      return;
    }

    this.elements.splice(index, 1);
    this.hooks.elementsChange.call();
  }

  registerGroup(definition: TCanvasRegistryGroupDefinition) {
    this.groups.set(definition.id, definition);
    this.hooks.groupsChange.call();

    return () => {
      this.unregisterGroup(definition.id);
    };
  }

  unregisterGroup(id: string) {
    const didDelete = this.groups.delete(id);
    if (!didDelete) {
      return;
    }

    this.hooks.groupsChange.call();
  }

  getElements() {
    return fnSortByPriority(this.elements);
  }

  getGroups() {
    return fnSortByPriority([...this.groups.values()]);
  }

  /**
   * Returns all matching element definitions for one persisted element.
   * Results are ordered by ascending priority.
   */
  getMatchingElementDefinitionsByElement(element: TElement) {
    return this.getElements().filter((definition) => definition.matchesElement?.(element) ?? false);
  }

  /**
   * Returns all matching element definitions for one runtime node.
   * Results are ordered by ascending priority.
   */
  getMatchingElementDefinitionsByNode(node: Konva.Node) {
    return this.getElements().filter((definition) => definition.matchesNode?.(node) ?? false);
  }

  /**
   * Returns the first matching group definition for one runtime node.
   * Groups are single-owner registrations.
   */
  getGroupDefinitionByNode(node: Konva.Node) {
    return this.getGroups().find((definition) => definition.matchesNode(node)) ?? null;
  }

  /**
   * Serializes one runtime node into one persisted element.
   * Uses the first matching base serializer, then runs all matching serialize modifiers.
   */
  toElement(node: Konva.Node) {
    const definitions = this.getMatchingElementDefinitionsByNode(node);
    const baseDefinition = definitions.find((definition) => definition.toElement);
    if (!baseDefinition?.toElement) {
      return null;
    }

    let element = baseDefinition.toElement(node);
    if (!element) {
      return null;
    }

    for (const definition of definitions) {
      const nextElement: TElement | void = definition.afterToElement?.({ node, element });
      if (nextElement) {
        element = nextElement;
      }
    }

    return element;
  }

  /**
   * Serializes one runtime node into one persisted group.
   */
  toGroup(node: Konva.Node) {
    const definition = this.getGroupDefinitionByNode(node);
    if (!definition) {
      return null;
    }

    return definition.toGroup(node)
  }

  /**
   * Resolves the persisted type for one runtime node.
   * Returns "group" for group nodes, otherwise returns element.data.type.
   * @deprecated use fnGetCanvasNodeKind
   */
  getNodeType(node: Konva.Node): TCanvasNodeType | null {
    if (this.toGroup(node)) {
      return "group";
    }

    const element = this.toElement(node);
    return element?.data.type ?? null;
  }

  /**
   * Resolves merged selection-style menu config for one persisted element.
   */
  getSelectionStyleMenuConfigByElement(args: {
    element: TElement;
    theme?: ThemeService;
  }) {
    return fnMergeSelectionStyleMenuConfigs(this.getMatchingElementDefinitionsByElement(args.element).map((definition) => {
      return definition.getSelectionStyleMenu?.({
        element: args.element,
        theme: args.theme,
      }) ?? null;
    }));
  }

  /**
   * Resolves merged selection-style menu config for one runtime node.
   */
  getSelectionStyleMenuConfigByNode(args: {
    node: Konva.Node;
    theme?: ThemeService;
  }) {
    const element = this.toElement(args.node);
    if (!element) {
      return null;
    }

    return this.getSelectionStyleMenuConfigByElement({
      element,
      theme: args.theme,
    });
  }

  /**
   * Resolves selection-style menu config for one registry definition id.
   * Useful for active-tool defaults when no element instance exists yet.
   */
  getSelectionStyleMenuConfigById(args: {
    id: string;
    theme?: ThemeService;
  }) {
    return fnMergeSelectionStyleMenuConfigs(this.getElements()
      .filter((definition) => definition.id === args.id)
      .map((definition) => {
        return definition.getSelectionStyleMenu?.({
          theme: args.theme,
        }) ?? null;
      }));
  }

  /**
   * Creates one runtime node from one persisted element.
   * Uses the first matching base creator, then runs all matching create modifiers,
   * then runs all matching listener attachments.
   */
  createNodeFromElement(element: TElement) {
    const definitions = this.getMatchingElementDefinitionsByElement(element);
    const baseDefinition = definitions.find((definition) => definition.createNode);
    if (!baseDefinition?.createNode) {
      return null;
    }

    const node = baseDefinition.createNode(element);
    if (!node) {
      return null;
    }

    for (const definition of definitions) {
      definition.afterCreateNode?.({ element, node });
    }

    for (const definition of definitions) {
      definition.attachListeners?.(node);
    }

    node.setAttr(VC_NODE_KIND_ATTR, 'element' as TCanvasNodeKind);
    return node;
  }

  /**
   * Creates one runtime node from one persisted group.
   * Groups are single-owner registrations.
   */
  createNodeFromGroup(group: TGroup) {
    for (const definition of this.getGroups()) {
      const node = definition.createNode(group);
      if (!node) {
        continue;
      }

      definition.attachListeners?.(node);
      node.setAttr(VC_NODE_KIND_ATTR, 'group' as TCanvasNodeKind);
      return node;
    }

    return null;
  }

  /**
   * Attaches runtime listeners to an existing node.
   * For groups this is single-owner.
   * For elements this runs all matching definitions in priority order.
   */
  attachListeners(node: Konva.Node) {
    const groupDefinition = this.getGroupDefinitionByNode(node);
    if (groupDefinition?.attachListeners) {
      return groupDefinition.attachListeners(node as Konva.Group);
    }

    const definitions = this.getMatchingElementDefinitionsByNode(node);
    if (definitions.length === 0) {
      return false;
    }

    let didAttach = false;
    for (const definition of definitions) {
      const result = definition.attachListeners?.(node);
      if (result !== undefined) {
        didAttach = Boolean(result) || didAttach;
      }
    }

    return didAttach;
  }

  /**
   * Starts clone-drag behavior for an existing runtime element.
   * Runs matching definition handlers in priority order until one handles it.
   */
  createDragClone(args: {
    node: Konva.Node;
    selection: Konva.Node[]
  }) {
    const definitions = this.getMatchingElementDefinitionsByNode(args.node);
    if (definitions.length === 0) {
      return false;
    }

    let didHandle = false;
    for (const definition of definitions) {
      const result = definition.createDragClone?.(args);
      if (result !== undefined) {
        didHandle = Boolean(result) || didHandle;
      }
    }

    return didHandle;
  }

  /**
   * Replays one persisted element onto the runtime scene.
   * Runs all matching element update handlers in priority order.
   */
  updateElement(element: TElement) {
    const definitions = this.getMatchingElementDefinitionsByElement(element);
    if (definitions.length === 0) {
      return false;
    }

    let didUpdate = false;
    for (const definition of definitions) {
      const result = definition.updateElement?.(element);
      if (result !== undefined) {
        didUpdate = Boolean(result) || didUpdate;
      }
    }

    return didUpdate;
  }

  getTransformOptions(args: {
    node: Konva.Node;
    selection: Array<Konva.Group | Konva.Shape>;
  }) {
    const element = this.toElement(args.node);
    if (!element) {
      return {} satisfies TCanvasRegistryTransformOptions;
    }

    const definitions = this.getMatchingElementDefinitionsByNode(args.node);
    let options: TCanvasRegistryTransformOptions = {};

    for (const definition of definitions) {
      const nextOptions = definition.getTransformOptions?.({
        node: args.node,
        element,
        selection: args.selection,
      });
      if (!nextOptions) {
        continue;
      }

      options = {
        ...options,
        ...nextOptions,
      };
    }

    return options;
  }

}
