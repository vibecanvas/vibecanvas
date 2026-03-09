import { makePersisted } from "@solid-primitives/storage";
import { createStore } from "solid-js/store";
import type { TBackendCanvas } from "./types/backend.types";
import { orpcWebsocketService } from "./services/orpc-websocket";

type TGlobalStore = {
  theme: "light" | "dark";
  sidebarVisible: boolean;
  canvases: TBackendCanvas[];
};

const [store, setStore, init] = makePersisted(createStore<TGlobalStore>({
  theme: "light",
  sidebarVisible: true,
  canvases: [],
}), { name: "vibecanvas" });

// Fetch canvas list on startup
orpcWebsocketService.safeClient.api.canvas.list()
  .then(([err, result]) => {
    if (err) return;
    setStore("canvases", result);
  });

export { init, setStore, store };

