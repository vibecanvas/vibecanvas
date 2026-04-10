import { createOrpcWebsocketService } from "@vibecanvas/orpc-client";
import { showErrorToast, showSuccessToast, showToast } from "../components/ui/Toast";

export const orpcWebsocketService = createOrpcWebsocketService({
  onNotification(event) {
    if (event.type === "error") showErrorToast(event.title, event.description);
    else if (event.type === "success") showSuccessToast(event.title, event.description);
    else showToast(event.title, event.description);
  },
});
