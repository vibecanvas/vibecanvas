import "solid-js";

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "ic-spectrum-canvas": JSX.HTMLAttributes<HTMLElement> & {
        renderer?: "webgl" | "webgpu";
        "shader-compiler-path"?: string;
        theme?: string;
        "app-state"?: string;
        nodes?: string;
        ref?: (el: HTMLElement) => void;
      };
    }
  }
}
