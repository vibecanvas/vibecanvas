import { Show } from "solid-js";

type ICanvasRecorderProps = {
  open: () => boolean;
  onOpenChange: (open: boolean) => void;
  recording: () => boolean;
  stepCount: () => number;
  opCount: () => number;
  reducedEvents: () => boolean;
  onReducedEventsChange: (value: boolean) => void;
  canExport: () => boolean;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
  onExport: () => void;
};

function ActionButton(props: {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      class="border border-border bg-card px-2 py-1 text-[11px] font-mono text-foreground transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-stone-800"
      classList={{
        "bg-red-500 text-white hover:bg-red-600 dark:hover:bg-red-600": props.variant === "danger",
      }}
    >
      {props.label}
    </button>
  );
}

export function CanvasRecorder(props: ICanvasRecorderProps) {
  return (
    <div class="absolute bottom-3 right-16 pointer-events-none z-50">
      <div class="pointer-events-auto relative flex flex-col items-end gap-2">
        <Show when={props.open()}>
          <div class="min-w-[220px] border border-border bg-card/95 p-3 text-foreground shadow-md backdrop-blur">
            <div class="flex items-center justify-between gap-3 border-b border-border pb-2">
              <div>
                <div class="font-display text-sm leading-none">Recorder</div>
                <div class="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {props.recording() ? "REC" : "IDLE"}
                </div>
              </div>

              <div class="flex h-3 w-3 items-center justify-center border border-border bg-card">
                <div
                  class="h-1.5 w-1.5 rounded-full"
                  classList={{
                    "bg-red-500": props.recording(),
                    "bg-stone-300": !props.recording(),
                  }}
                />
              </div>
            </div>

            <div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>Steps</span>
              <span class="text-right font-mono text-foreground">{props.stepCount()}</span>
              <span>CRDT Ops</span>
              <span class="text-right font-mono text-foreground">{props.opCount()}</span>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              <Show
                when={!props.recording()}
                fallback={<ActionButton label="Stop" variant="danger" onClick={props.onStop} />}
              >
                <ActionButton label="Start" onClick={props.onStart} />
              </Show>
              <ActionButton label="Clear" onClick={props.onClear} />
              <ActionButton label="Export" onClick={props.onExport} disabled={!props.canExport()} />
            </div>

            <label class="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
              <span>Reduced events</span>
              <input
                type="checkbox"
                checked={props.reducedEvents()}
                onInput={(event) => props.onReducedEventsChange(event.currentTarget.checked)}
                class="h-3.5 w-3.5 accent-foreground"
              />
            </label>
          </div>
        </Show>

        <button
          type="button"
          class="flex h-11 min-w-11 items-center justify-center gap-2 border border-border bg-card px-3 text-foreground shadow-md transition-colors hover:bg-stone-200 dark:hover:bg-stone-800"
          aria-label="Toggle recorder panel"
          title="Recorder"
          onClick={() => props.onOpenChange(!props.open())}
        >
          <div
            class="h-2.5 w-2.5 rounded-full border border-border"
            classList={{
              "bg-red-500": props.recording(),
              "bg-stone-300": !props.recording(),
            }}
          />
          <span class="font-display text-[11px] leading-none">REC</span>
        </button>
      </div>
    </div>
  );
}
