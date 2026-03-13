import Konva from "konva";

type TTransformHandler = (node: Konva.Node) => void;

type TTransformManagerArgs = {
  worldOverlay: Konva.Group;
  onTransformStart?: () => void;
  onTransform?: () => void;
  onTransformEnd?: () => void;
};

export class TransformManager {
  #transformer: Konva.Transformer;
  #handlers = new Map<string, TTransformHandler>();

  constructor(args: TTransformManagerArgs) {
    this.#transformer = new Konva.Transformer({
      rotateEnabled: true,
      resizeEnabled: true,
      borderStroke: "#3b82f6",
      borderStrokeWidth: 1,
      borderDash: [6, 4],
      anchorFill: "#ffffff",
      anchorStroke: "#3b82f6",
      anchorStrokeWidth: 1,
      anchorSize: 8,
      ignoreStroke: true,
    });

    if (args.onTransformStart) this.#transformer.on("transformstart", args.onTransformStart);
    if (args.onTransform) this.#transformer.on("transform", args.onTransform);
    this.#transformer.on("transformend", () => {
      this.#handleTransformEnd();
      args.onTransformEnd?.();
    });

    args.worldOverlay.add(this.#transformer);
  }

  registerHandler(elementType: string, handler: TTransformHandler) {
    this.#handlers.set(elementType, handler);
  }

  clear() {
    this.#transformer.nodes([]);
    this.#draw();
  }

  setNodes(nodes: Konva.Node[]) {
    this.#transformer.nodes(nodes);
    this.#transformer.moveToTop();
    this.#draw();
  }

  isTransformerNode(node: Konva.Node | null | undefined) {
    let currentNode = node ?? null;

    while (currentNode) {
      if (currentNode === this.#transformer) return true;
      if (currentNode.getParent()?.className === "Transformer") return true;
      currentNode = currentNode.getParent();
    }

    return false;
  }

  destroy() {
    this.#transformer.destroy();
  }

  #handleTransformEnd() {
    for (const node of this.#transformer.nodes()) {
      const elementType = node.getAttr("vcElementType");
      if (typeof elementType !== "string") continue;

      const handler = this.#handlers.get(elementType);
      handler?.(node);
    }
  }

  #draw() {
    this.#transformer.getLayer()?.batchDraw();
  }
}

export type { TTransformHandler, TTransformManagerArgs };
