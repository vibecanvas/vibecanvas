import { makePersisted } from "@solid-primitives/storage";
import { createStore } from "solid-js/store";

type TGlobalStore = {
  activeCanvasId: string | null;
  theme: "light" | "dark";
  sidebarVisible: boolean;
};

const [store, setStore, init] = makePersisted(createStore<TGlobalStore>({
  activeCanvasId: null,
  theme: "light",
  sidebarVisible: true
}), { name: "vibecanvas" });


export { init, setStore, store };

