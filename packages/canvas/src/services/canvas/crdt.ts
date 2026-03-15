import { DocHandle } from "@automerge/automerge-repo";
import { TCanvasDoc } from "@vibecanvas/shell/automerge/index";






export class Crdt {

  constructor(private docHandle: DocHandle<TCanvasDoc>) {
    console.log(docHandle.doc())
  }

}