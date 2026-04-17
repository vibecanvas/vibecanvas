import type { TElement, TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type { ThemeService } from "@vibecanvas/service-theme";
import type { SyncHook } from "@vibecanvas/tapable";
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
  selection: Konva.Node[];
};

export type TCanvasRegistryRotateArgs = {
  node: Konva.Node;
  element: TElement;
  rotation: number;
  selection: Konva.Node[];
};

export type TCanvasRegistryResizeArgs = {
  node: Konva.Node;
  element: TElement;
  pointer: { x: number; y: number } | null;
  anchors: TCanvasTransformAnchor[];
  selection: Konva.Node[];
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

type TCanvasRegistryToElement = (node: Konva.Node) => TElement | null;
type TCanvasRegistryAfterToElement = (args: { node: Konva.Node; element: TElement }) => TElement | void;
type TCanvasRegistryCreateNode = (element: TElement) => Konva.Node | null;
type TCanvasRegistryAfterCreateNode = (args: { element: TElement; node: Konva.Node }) => void;
type TCanvasRegistryAttachListeners = (node: Konva.Node) => boolean | void;
type TCanvasRegistryUpdateElement = (element: TElement) => boolean | void;
type TCanvasRegistryCreateDragClone = (args: {
  node: Konva.Node;
  selection: Array<Konva.Node>;
}) => boolean | void;
type TCanvasRegistryGetSelectionStyleMenu = (args: TCanvasRegistrySelectionStyleArgs) => TCanvasRegistrySelectionStyleConfig | null | void;
type TCanvasRegistryGetTransformOptions = (args: {
  node: Konva.Node;
  element: TElement;
  selection: Array<Konva.Node>;
}) => TCanvasRegistryTransformOptions | void;
type TCanvasRegistryMoveHook = (args: TCanvasRegistryMoveArgs) => TCanvasRegistryTransformHookResult | void;
type TCanvasRegistryRotateHook = (args: TCanvasRegistryRotateArgs) => TCanvasRegistryTransformHookResult | void;
type TCanvasRegistryResizeHook = (args: TCanvasRegistryResizeArgs) => TCanvasRegistryTransformHookResult | void;

type TCanvasRegistryRequireAtLeastOne<T extends object> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>;
}[keyof T];

type TCanvasRegistryElementMatcher = {
  /**
   * Matches persisted elements for create/update/clone flows.
   * Base definitions should usually provide this.
   * Modifier definitions may provide it when they want to augment persisted element behavior.
   */
  matchesElement: (element: TElement) => boolean;
};

type TCanvasRegistryNodeMatcher = {
  /**
   * Matches runtime nodes for serialize/listener flows.
   * Base definitions should usually provide this.
   * Modifier definitions may provide it when they want to augment runtime node behavior.
   */
  matchesNode: (node: Konva.Node) => boolean;
};

type TCanvasRegistryElementHookBag = {
  /**
   * Base serialize step.
   * The first matching definition with toElement builds the initial persisted element.
   */
  toElement?: TCanvasRegistryToElement;
  /**
   * Serialize augmentation step.
   * Runs after the base toElement step for every matching definition in priority order.
   * May return a replacement element or mutate by returning void and relying on object updates.
   */
  afterToElement?: TCanvasRegistryAfterToElement;
  /**
   * Base create step.
   * The first matching definition with createNode builds the one root runtime node for the element.
   * If the element needs multiple visual parts, return a Konva.Group.
   */
  createNode?: TCanvasRegistryCreateNode;
  /**
   * Create augmentation step.
   * Runs after the base createNode step for every matching definition in priority order.
   */
  afterCreateNode?: TCanvasRegistryAfterCreateNode;
  /**
   * Runtime wiring step.
   * Runs for every matching definition in priority order.
   * Use this to attach drag/pointer/transform listeners and other runtime behavior.
   */
  attachListeners?: TCanvasRegistryAttachListeners;
  /**
   * Update step.
   * Runs for every matching definition in priority order.
   * Use this to apply persisted element state back onto an existing runtime node.
   */
  updateElement?: TCanvasRegistryUpdateElement;
  /**
   * Optional alt-drag clone behavior for this element definition.
   * Returns true when the definition handled clone-drag startup.
   */
  createDragClone?: TCanvasRegistryCreateDragClone;
  /**
   * Optional selection-style menu config for this element definition.
   * Used for active-tool defaults and for combining style controls across selections.
   */
  getSelectionStyleMenu?: TCanvasRegistryGetSelectionStyleMenu;
  /**
   * Optional transformer UI behavior for this node type.
   * Runs in priority order and later definitions may override earlier fields.
   */
  getTransformOptions?: TCanvasRegistryGetTransformOptions;
  /**
   * Called while one selected node is moved.
   * Publishes the move event to the CRDT if `crdt` is true.
   */
  onMove?: TCanvasRegistryMoveHook;
  /**
   * Called after move handling completes.
   */
  afterMove?: TCanvasRegistryMoveHook;
  /**
   * Called while one selected node is rotated.
   * Publishes the rotate event to the CRDT if `crdt` is true.
   */
  onRotate?: TCanvasRegistryRotateHook;
  /**
   * Called after rotate handling completes.
   */
  afterRotate?: TCanvasRegistryRotateHook;
  /**
   * Called while one selected node is resized.
   * Publishes the resize event to the CRDT if `crdt` is true.
   */
  onResize?: TCanvasRegistryResizeHook;
  /**
   * Called after resize handling completes.
   */
  afterResize?: TCanvasRegistryResizeHook;
};

type TCanvasRegistryNodeRuntimeHookBag = Pick<
  TCanvasRegistryElementHookBag,
  | "attachListeners"
  | "createDragClone"
  | "getTransformOptions"
  | "onMove"
  | "afterMove"
  | "onRotate"
  | "afterRotate"
  | "onResize"
  | "afterResize"
>;

type TCanvasRegistryElementRuntimeHookBag = Pick<
  TCanvasRegistryElementHookBag,
  | "updateElement"
  | "getSelectionStyleMenu"
>;

type TCanvasRegistrySerializeDefinition =
  | (TCanvasRegistryNodeMatcher & {
    toElement: TCanvasRegistryToElement;
    afterToElement?: never;
  })
  | (TCanvasRegistryNodeMatcher & {
    toElement?: never;
    afterToElement: TCanvasRegistryAfterToElement;
  })
  | {
    toElement?: never;
    afterToElement?: never;
  };

type TCanvasRegistryCreateDefinition =
  | (TCanvasRegistryElementMatcher & {
    createNode: TCanvasRegistryCreateNode;
    afterCreateNode?: never;
  })
  | (TCanvasRegistryElementMatcher & {
    createNode?: never;
    afterCreateNode: TCanvasRegistryAfterCreateNode;
  })
  | {
    createNode?: never;
    afterCreateNode?: never;
  };

type TCanvasRegistryNodeRuntimeDefinition =
  | (TCanvasRegistryNodeMatcher & TCanvasRegistryRequireAtLeastOne<TCanvasRegistryNodeRuntimeHookBag>)
  | {
    [K in keyof TCanvasRegistryNodeRuntimeHookBag]?: never;
  };

type TCanvasRegistryElementRuntimeDefinition =
  | (TCanvasRegistryElementMatcher & TCanvasRegistryRequireAtLeastOne<TCanvasRegistryElementRuntimeHookBag>)
  | {
    [K in keyof TCanvasRegistryElementRuntimeHookBag]?: never;
  };

/**
 * One definition may own a lifecycle step or augment it, but not both in the same step.
 * The required matcher is enforced based on the hook family the definition participates in.
 */
export type TCanvasRegistryElementDefinition = {
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
   * Required when the definition participates in element-based hooks.
   */
  matchesElement?: (element: TElement) => boolean;
  /**
   * Matches runtime nodes for serialize/listener flows.
   * Required when the definition participates in node-based hooks.
   */
  matchesNode?: (node: Konva.Node) => boolean;
} & TCanvasRegistryRequireAtLeastOne<TCanvasRegistryElementHookBag>
  & TCanvasRegistrySerializeDefinition
  & TCanvasRegistryCreateDefinition
  & TCanvasRegistryNodeRuntimeDefinition
  & TCanvasRegistryElementRuntimeDefinition;

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
