import { isKonvaGroup } from "src/core/GUARDS";
import { WIDGET_HOST_ELEMENT_DATA_ATTR } from "./CONSTANTS";
import { TCustomData, TElement, TWidgetData } from "@vibecanvas/service-automerge/types/canvas-doc.types";
import { IWidgetConfig } from "./interface";
import { fnGetNodeZIndex } from "src/core/fn.get-node-z-index";
import { fnGetCanvasParentGroupId } from "src/core/fx.canvas-node-semantics";

type TArgs = {
   node: unknown
   wConfig: IWidgetConfig
}

export function toElement(args: TArgs) {
  if(!isKonvaGroup(args.node)) return null
  const data: TWidgetData = args.node.attrs(WIDGET_HOST_ELEMENT_DATA_ATTR)
  if(!data) return null

  const element: TElement = {
    id: args.wConfig.id,
    bindings: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    data,
    style: {},
    locked: false,
    parentGroupId: fnGetCanvasParentGroupId({ node: args.node,  }),
    rotation: args.node.rotation(),
    x: args.node.x(),
    y: args.node.y(),
    zIndex: fnGetNodeZIndex({ node: args.node })
  }
  return element;
}
