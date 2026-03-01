import { createEffect, createSignal, onCleanup, Show } from "solid-js";

type TTextEditorProps = {
  content: string;
  truncated: boolean;
  onSave: (nextContent: string) => void;
  onDirty: (nextDirty: boolean) => void;
};

const SAVE_DEBOUNCE_MS = 1000;

export function TextEditor(props: TTextEditorProps) {
  const [value, setValue] = createSignal(props.content);
  let saveTimeout: ReturnType<typeof setTimeout> | undefined;

  createEffect(() => {
    const nextContent = props.content;
    if (nextContent === value()) return;
    setValue(nextContent);
    props.onDirty(false);
  });

  onCleanup(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
  });

  return (
    <div class="flex-1 min-h-0 flex flex-col">
      <textarea
        class="flex-1 min-h-0 resize-none border-0 bg-background p-3 font-mono text-xs leading-relaxed outline-none disabled:cursor-not-allowed disabled:text-muted-foreground"
        value={value()}
        disabled={props.truncated}
        onInput={(event) => {
          const next = event.currentTarget.value;
          setValue(next);
          props.onDirty(true);

          if (saveTimeout) clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => {
            props.onSave(next);
          }, SAVE_DEBOUNCE_MS);
        }}
      />

      <Show when={props.truncated}>
        <div class="border-t border-border bg-muted p-1 font-mono text-xs text-muted-foreground">
          File truncated (exceeds 512KB) - editing disabled
        </div>
      </Show>
    </div>
  );
}
