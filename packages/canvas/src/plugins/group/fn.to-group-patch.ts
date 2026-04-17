import type { TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { CanvasRegistryService } from "../../services/canvas-registry/CanvasRegistryService";

export type TArgsToGroupPatch = {
  canvasRegistry: CanvasRegistryService;
  group: Konva.Group;
  getNodeZIndex: (node: Konva.Group) => string;
  fallbackCreatedAt: number;
};

export function fnToGroupPatch(args: TArgsToGroupPatch): TGroup {
  const parent = args.group.getParent();
  return {
    id: args.group.id(),
    parentGroupId: parent && args.canvasRegistry.toGroup(parent) ? parent.id() : null,
    zIndex: args.getNodeZIndex(args.group),
    locked: false,
    createdAt: Number(args.group.getAttr("vcGroupCreatedAt") ?? args.fallbackCreatedAt),
  };
}
