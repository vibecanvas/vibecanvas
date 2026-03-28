import { init as initGhostty, Terminal as GhosttyTerminal } from "ghostty-web";
import { onCleanup, onMount } from "solid-js";

export type TGhosttyTerminalInstance = InstanceType<typeof GhosttyTerminal>;

export type TTerminalMountReadyArgs = {
  term: TGhosttyTerminalInstance;
  root: HTMLDivElement;
  host: HTMLDivElement;
};

type TGhosttyTerminalMountProps = {
  class?: string;
  onReady: (args: TTerminalMountReadyArgs) => void | Promise<void>;
  onData?: (data: string) => void;
  onResize?: (next: { cols: number; rows: number }) => void;
  onCleanup?: (term: TGhosttyTerminalInstance | null) => void;
};

let ghosttyInitPromise: Promise<void> | null = null;

function ensureGhosttyInit(): Promise<void> {
  if (!ghosttyInitPromise) {
    ghosttyInitPromise = initGhostty();
  }

  return ghosttyInitPromise;
}

export function GhosttyTerminalMount(props: TGhosttyTerminalMountProps) {
  let hostRef: HTMLDivElement | undefined;
  let rootRef: HTMLDivElement | undefined;
  let term: TGhosttyTerminalInstance | null = null;
  let disposed = false;

  onMount(async () => {
    await ensureGhosttyInit();

    if (disposed || !hostRef || !rootRef) return;

    rootRef.style.caretColor = "transparent";
    rootRef.style.outline = "none";

    term = new GhosttyTerminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontFamily: "JetBrains Mono Variable, monospace",
      fontSize: 13,
      scrollback: 10000,
      theme: {
        background: "#111214",
        foreground: "#e5e7eb",
        cursor: "#f59e0b",
        selectionBackground: "#374151",
      },
    });

    term.open(rootRef);

    if (term.element) {
      term.element.style.caretColor = "transparent";
      term.element.style.outline = "none";
    }

    if (term.textarea) {
      term.textarea.style.caretColor = "transparent";
    }

    term.onData((data) => {
      props.onData?.(data);
    });

    term.onResize((next) => {
      props.onResize?.(next);
    });

    await props.onReady({ term, root: rootRef, host: hostRef });
  });

  onCleanup(() => {
    disposed = true;
    props.onCleanup?.(term);
    term?.dispose();
    term = null;
  });

  return (
    <div
      ref={hostRef}
      data-ghostty-terminal-host="true"
      class={props.class ?? "h-full w-full flex-1 overflow-hidden bg-[#111214]"}
      style={{ "min-width": "0", "min-height": "0" }}
    >
      <div
        ref={rootRef}
        data-ghostty-terminal-root="true"
        class="h-full w-full"
        style={{ "min-width": "0", "min-height": "0" }}
      />
    </div>
  );
}
