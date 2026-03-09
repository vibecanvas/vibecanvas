import { makePersisted } from "@solid-primitives/storage";
import { createStore } from "solid-js/store";

type TGlobalStore = {
  theme: "light" | "dark";
  sidebarVisible: boolean;
};

const [store, setStore, init] = makePersisted(createStore<TGlobalStore>({
  theme: "light",
  sidebarVisible: true
}), { name: "vibecanvas" });


export { init, setStore, store };

