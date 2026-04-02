import type Konva from "konva";
import type { Setter } from "solid-js";
import type { TElement, TIframeBrowserData } from "@vibecanvas/shell/automerge/index";

export type TBrowserElement = TElement & { data: TIframeBrowserData };

export type TBrowserMountRecord = {
  node: Konva.Rect;
  mountElement: HTMLDivElement;
  dispose: () => void;
  setElement: Setter<TBrowserElement>;
  setPendingInteraction: Setter<boolean>;
};
