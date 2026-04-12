import type { TGroup } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import type Konva from "konva";
import type { RenderService } from "../../new-services/render/RenderService";

export type TArgsToGroupPatch = {
  render: RenderService;
  group: Konva.Group;
  getNodeZIndex: (node: Konva.Group) => string;
  fallbackCreatedAt: number;
};

export function fxToGroupPatch(args: TArgsToGroupPatch): TGroup {
  const parent = args.group.getParent();
  return {
    id: args.group.id(),
    parentGroupId: parent instanceof args.render.Group ? parent.id() : null,
    zIndex: args.getNodeZIndex(args.group),
    locked: false,
    createdAt: Number(args.group.getAttr("vcGroupCreatedAt") ?? args.fallbackCreatedAt),
  };
}
