import { showErrorToast, showSuccessToast, showToast } from "@/components/ui/Toast";
import { orpcWebsocketService } from "@/services/orpc-websocket";
import { setStore, store } from "@/store";
import type { TBackendCanvas } from "@/types/backend.types";
import { Canvas } from "@vibecanvas/canvas";
import { type Component } from "solid-js";

type CanvasPageProps = {
  canvas: TBackendCanvas;
};

const CanvasPage: Component<CanvasPageProps> = (props) => {

  return (
    <Canvas
      canvas={props.canvas}
      image={{
        uploadImage: async ({ base64, format }) => {
          const [error, result] = await orpcWebsocketService.apiService.api.file.put({
            body: {
              base64,
              format,
            },
          });

          if (error || !result) {
            throw new Error(error?.message ?? "Failed to upload image");
          }

          return result;
        },
        cloneImage: async ({ url }) => {
          const [error, result] = await orpcWebsocketService.apiService.api.file.clone({
            body: { url },
          });

          if (error || !result) {
            throw new Error(error?.message ?? "Failed to clone image file");
          }

          return result;
        },
        deleteImage: async ({ url }) => {
          const [error, result] = await orpcWebsocketService.apiService.api.file.remove({
            body: { url },
          });

          if (error || !result) {
            throw new Error(error?.message ?? "Failed to delete image file");
          }

          return result;
        },
      }}
      filetree={{ canvasId: props.canvas.id, apiService: orpcWebsocketService.apiService }}
      file={{ apiService: orpcWebsocketService.apiService }}
      terminal={{ apiService: orpcWebsocketService.apiService }}
      notification={{ showError: showErrorToast, showSuccess: showSuccessToast, showInfo: showToast }}
      store={{ sidebarVisible: () => store.sidebarVisible, onToggleSidebar: () => setStore('sidebarVisible', v => !v) }}
    />
  );
};

export default CanvasPage;
