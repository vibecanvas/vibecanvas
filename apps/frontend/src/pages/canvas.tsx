import { showErrorToast, showSuccessToast, showToast } from "@/components/ui/Toast";
import type { TBackendCanvas } from "@/types/backend.types";
import { Canvas } from "@vibecanvas/canvas";
import { type Component } from "solid-js";

type CanvasPageProps = {
  canvas: TBackendCanvas;
};

const CanvasPage: Component<CanvasPageProps> = (props) => {

  return (
    <Canvas canvas={props.canvas} notification={{ showError: showErrorToast, showSuccess: showSuccessToast, showInfo: showToast }} />
  );
};

export default CanvasPage;
