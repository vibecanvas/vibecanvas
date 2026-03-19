import type { Accessor, Setter } from "solid-js";
import { createComponent, createSignal } from "solid-js";
import { render } from "solid-js/web";
import { CanvasHelp } from "../components/CanvasHelp";
import type { IPlugin, IPluginContext } from "./interface";

function mountSolidComponent(context: IPluginContext, open: Accessor<boolean>, setOpen: Setter<boolean>) {
  const mountElement = document.createElement("div");
  mountElement.className = "absolute bottom-3 right-3 pointer-events-none z-50";
  context.stage.container().appendChild(mountElement);

  const disposeRender = render(
    () => createComponent(CanvasHelp, {
      open,
      onOpenChange: setOpen,
    }),
    mountElement,
  );

  return { mountElement, disposeRender };
}

export class HelpPlugin implements IPlugin {
  #open: Accessor<boolean>;
  #setOpen: Setter<boolean>;
  #mountElement: HTMLDivElement | null = null;
  #disposeRender: (() => void) | null = null;

  constructor() {
    const [open, setOpen] = createSignal(false);
    this.#open = open;
    this.#setOpen = setOpen;
  }

  apply(context: IPluginContext): void {
    context.hooks.init.tap(() => {
      const { mountElement, disposeRender } = mountSolidComponent(context, this.#open, this.#setOpen);
      this.#mountElement = mountElement;
      this.#disposeRender = disposeRender;
    });

    context.hooks.destroy.tap(() => {
      this.#disposeRender?.();
      this.#mountElement?.remove();
      this.#disposeRender = null;
      this.#mountElement = null;
    });

    context.hooks.keydown.tap((event) => {
      if (HelpPlugin.isQuestionMarkShortcut(event)) {
        event.preventDefault();
        this.#setOpen(true);
        return true;
      }

      return false;
    });
  }

  private static isQuestionMarkShortcut(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    return event.key === "?";
  }
}
