import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { IService } from "@vibecanvas/runtime";
import { SyncHook } from "@vibecanvas/tapable";
import type { ThemeService } from "@vibecanvas/service-theme";
import type Konva from "konva";
import type { TCapStyle, TFontFamily, TLineType, TStrokeWidthOption } from "../../components/SelectionStyleMenu/types";

export type TCanvasNodeType = TElement["data"]["type"] | "group";

export type TCanvasRegistryTransformHookResult = {
  cancel: boolean;
  crdt: boolean;
};

export type TCanvasTransformAnchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type TCanvasRegistryTransformOptions = {
  enabledAnchors?: TCanvasTransformAnchor[];
  keepRatio?: boolean;
  flipEnabled?: boolean;
};

export type TCanvasRegistryMoveArgs = {
  node: Konva.Node;
  element: TElement;
  pointer: { x: number; y: number } | null;
  selection: Array<Konva.Group | Konva.Shape>;
};

export type TCanvasRegistryRotateArgs = {
  node: Konva.Node;
  element: TElement;
  rotation: number;
  selection: Array<Konva.Group | Konva.Shape>;
};

export type TCanvasRegistryResizeArgs = {
  node: Konva.Node;
  element: TElement;
  pointer: { x: number; y: number } | null;
  anchors: TCanvasTransformAnchor[];
  selection: Array<Konva.Group | Konva.Shape>;
};

export type TCanvasRegistrySelectionStyleSections = {
  showFillPicker: boolean;
  showStrokeColorPicker: boolean;
  showStrokeWidthPicker: boolean;
  showTextPickers: boolean;
  showOpacityPicker: boolean;
  showLineTypePicker: boolean;
  showStartCapPicker: boolean;
  showEndCapPicker: boolean;
};

export type TCanvasRegistrySelectionStyleValues = {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: string;
  opacity?: number;
  fontFamily?: TFontFamily;
  fontSize?: string;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  lineType?: TLineType;
  startCap?: TCapStyle;
  endCap?: TCapStyle;
};

export type TCanvasRegistrySelectionStyleConfig = {
  sections?: Partial<TCanvasRegistrySelectionStyleSections>;
  values?: Partial<TCanvasRegistrySelectionStyleValues>;
  strokeWidthOptions?: TStrokeWidthOption[];
};

export type TCanvasRegistrySelectionStyleArgs = {
  theme?: ThemeService;
  element?: TElement;
  node?: Konva.Node;
};

export interface TCanvasRegistryElementDefinition {
  /**
   * Unique registration id for this definition.
   * This is a registration identity, not necessarily the persisted element type.
   */
  id: string;
  /**
   * Lower priority runs first.
   * Base element definitions should usually have lower priority than modifiers.
   */
  priority?: number;
  /**
   * Matches persisted elements for create/update/clone flows.
   * Base definitions should usually provide this.
   * Modifier definitions may provide it when they want to augment persisted element behavior.
   */
  matchesElement?: (element: TElement) => boolean;
  /**
   * Matches runtime nodes for serialize/listener flows.
   * Base definitions should usually provide this.
   * Modifier definitions may provide it when they want to augment runtime node behavior.
   */
  matchesNode?: (node: Konva.Node) => boolean;
  /**
   * Base serialize step.
   * The first matching definition with toElement builds the initial persisted element.
   */
  toElement?: (node: Konva.Node) => TElement | null;
  /**
   * Serialize augmentation step.
   * Runs after the base toElement step for every matching definition in priority order.
   * May return a replacement element or mutate by returning void and relying on object updates.
   */
  afterToElement?: (args: { node: Konva.Node; element: TElement }) => TElement | void;
  /**
   * Base create step.
   * The first matching definition with createNode builds the one root runtime node for the element.
   * If the element needs multiple visual parts, return a Konva.Group.
   */
  createNode?: (element: TElement) => Konva.Group | Konva.Shape | null;
  /**
   * Create augmentation step.
   * Runs after the base createNode step for every matching definition in priority order.
   */
  afterCreateNode?: (args: { element: TElement; node: Konva.Group | Konva.Shape }) => void;
  /**
   * Runtime wiring step.
   * Runs for every matching definition in priority order.
   * Use this to attach drag/pointer/transform listeners and other runtime behavior.
   */
  attachListeners?: (node: Konva.Node) => boolean | void;
  /**
   * Update step.
   * Runs for every matching definition in priority order.
   * Use this to apply persisted element state back onto an existing runtime node.
   */
  updateElement?: (element: TElement) => boolean | void;
  /**
   * Optional alt-drag clone behavior for this element definition.
   * Returns true when the definition handled clone-drag startup.
   */
  createDragClone?: (args: {
    node: Konva.Node;
    selection: Array<Konva.Group | Konva.Shape>;
  }) => boolean | void;
  /**
   * Optional selection-style menu config for this element definition.
   * Used for active-tool defaults and for combining style controls across selections.
   */
  getSelectionStyleMenu?: (args: TCanvasRegistrySelectionStyleArgs) => TCanvasRegistrySelectionStyleConfig | null | void;
  /**
   * Optional transformer UI behavior for this node type.
   * Runs in priority order and later definitions may override earlier fields.
   */
  getTransformOptions?: (args: {
    node: Konva.Node;
    element: TElement;
    selection: Array<Konva.Group | Konva.Shape>;
  }) => TCanvasRegistryTransformOptions | void;
  /**
   * Called while one selected node is moved.
   * Publishes the move event to the CRDT if `crdt` is true.
   */
  onMove?: (args: TCanvasRegistryMoveArgs) => TCanvasRegistryTransformHookResult | void;
  /**
   * Called after move handling completes.
   */
  afterMove?: (args: TCanvasRegistryMoveArgs) => TCanvasRegistryTransformHookResult | void;
  /**
   * Called while one selected node is rotated.
   * Publishes the rotate event to the CRDT if `crdt` is true.
   */
  onRotate?: (args: TCanvasRegistryRotateArgs) => TCanvasRegistryTransformHookResult | void;
  /**
   * Called after rotate handling completes.
   */
  afterRotate?: (args: TCanvasRegistryRotateArgs) => TCanvasRegistryTransformHookResult | void;
  /**
   * Called while one selected node is resized.
   * Publishes the resize event to the CRDT if `crdt` is true.
   */
  onResize?: (args: TCanvasRegistryResizeArgs) => TCanvasRegistryTransformHookResult | void;
  /**
   * Called after resize handling completes.
   */
  afterResize?: (args: TCanvasRegistryResizeArgs) => TCanvasRegistryTransformHookResult | void;
}

export type TCanvasRegistryGroupDefinition = {
  /**
   * Unique registration id for this group definition.
   * Groups are single-owner registrations and are not layered like elements.
   */
  id: string;
  /**
   * Lower priority runs first.
   * Usually groups should not overlap, but this keeps lookup deterministic.
   */
  priority?: number;
  /**
   * Matches runtime nodes that belong to this persisted group type.
   */
  matchesNode: (node: Konva.Node) => boolean;
  /**
   * Serializes one runtime node into one persisted group.
   */
  toGroup: (node: Konva.Node) => TGroup | null;
  /**
   * Creates one root runtime node for the group.
   */
  createNode: (group: TGroup) => Konva.Group | null;
  /**
   * Attaches runtime listeners for the group root node.
   */
  attachListeners?: (node: Konva.Group) => boolean;
};

export interface TCanvasRegistryServiceHooks {
  elementsChange: SyncHook<[]>;
  groupsChange: SyncHook<[]>;
}

function fnSortByPriority<T extends { priority?: number; id: string }>(entries: T[]) {
  return [...entries].sort((left, right) => {
    const leftPriority = left.priority ?? 10_000;
    const rightPriority = right.priority ?? 10_000;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.id.localeCompare(right.id);
  });
}

function fnMergeSelectionStyleMenuConfigs(
  configs: Array<TCanvasRegistrySelectionStyleConfig | null | undefined>,
) {
  let didResolveConfig = false;
  let sections: Partial<TCanvasRegistrySelectionStyleSections> | undefined;
  let values: Partial<TCanvasRegistrySelectionStyleValues> | undefined;
  let strokeWidthOptions: TStrokeWidthOption[] | undefined;

  configs.forEach((config) => {
    if (!config) {
      return;
    }

    didResolveConfig = true;

    if (config.sections) {
      sections = {
        ...(sections ?? {}),
        ...config.sections,
      };
    }

    if (config.values) {
      values = {
        ...(values ?? {}),
        ...config.values,
      };
    }

    if (config.strokeWidthOptions) {
      strokeWidthOptions = config.strokeWidthOptions;
    }
  });

  if (!didResolveConfig) {
    return null;
  }

  return {
    sections,
    values,
    strokeWidthOptions,
  } satisfies TCanvasRegistrySelectionStyleConfig;
}

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

    return definition.toGroup(node);
  }

  /**
   * Resolves the persisted type for one runtime node.
   * Returns "group" for group nodes, otherwise returns element.data.type.
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
    selection: Array<Konva.Group | Konva.Shape>;
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
