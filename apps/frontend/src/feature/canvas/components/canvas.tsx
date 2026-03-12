import type { TBackendCanvas } from "@/types/backend.types";
import type { DocHandle } from "@automerge/automerge-repo";
import type { TCanvasDoc } from "@vibecanvas/shell/automerge/index";

interface ICanvasProps {
  handle: DocHandle<TCanvasDoc>
  data: TBackendCanvas
}

export function Canvas(props: ICanvasProps) {
  return (
    <div>
      <h1>Canvas {props.data.id}</h1>
    </div>
  );
}