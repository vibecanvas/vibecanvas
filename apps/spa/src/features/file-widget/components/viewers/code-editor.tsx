import { autocompletion, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { search, searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { Compartment, EditorState } from "@codemirror/state";
import { drawSelection, EditorView, highlightSpecialChars, keymap, lineNumbers } from "@codemirror/view";
import { createEffect, onCleanup, onMount, Show } from "solid-js";
import { getLanguageExtension } from "../../util/ext-to-language";

const SAVE_DEBOUNCE_MS = 1000;

const vibecanvasTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--color-background)",
    color: "var(--color-foreground)",
    fontFamily: "'JetBrains Mono Variable', monospace",
    fontSize: "13px",
    height: "100%",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-scroller": {
    height: "100%",
    overflow: "auto",
  },
  ".cm-gutters": {
    backgroundColor: "var(--color-muted)",
    color: "var(--color-muted-foreground)",
    border: "none",
    borderRight: "1px solid var(--color-border)",
  },
  ".cm-activeLine": {
    backgroundColor: "color-mix(in srgb, var(--color-muted) 50%, transparent)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--color-accent)",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--color-accent)",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--color-primary)",
  },
  ".cm-matchingBracket": {
    backgroundColor: "var(--color-accent)",
    outline: "1px solid var(--color-border)",
  },
});

type TCodeEditorProps = {
  content: string;
  path: string;
  truncated: boolean;
  onSave: (nextContent: string) => void;
  onDirty: (nextDirty: boolean) => void;
};

export function CodeEditor(props: TCodeEditorProps) {
  let containerRef!: HTMLDivElement;
  let editorView: EditorView | undefined;
  let isApplyingExternalUpdate = false;
  let saveTimeout: ReturnType<typeof setTimeout> | undefined;

  const languageCompartment = new Compartment();
  const editableCompartment = new Compartment();

  onMount(async () => {
    const languageExtension = await getLanguageExtension(props.path);

    const state = EditorState.create({
      doc: props.content,
      extensions: [
        lineNumbers(),
        highlightSpecialChars(),
        drawSelection(),
        history(),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightSelectionMatches(),
        search(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
        ]),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        languageCompartment.of(languageExtension ? [languageExtension] : []),
        editableCompartment.of([
          EditorState.readOnly.of(props.truncated),
          EditorView.editable.of(!props.truncated),
        ]),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || isApplyingExternalUpdate) return;
          props.onDirty(true);

          if (saveTimeout) clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => {
            props.onSave(update.state.doc.toString());
          }, SAVE_DEBOUNCE_MS);
        }),
        vibecanvasTheme,
      ],
    });

    editorView = new EditorView({
      state,
      parent: containerRef,
    });
  });

  createEffect(() => {
    const next = props.content;
    if (!editorView) return;
    const current = editorView.state.doc.toString();
    if (next === current) return;

    isApplyingExternalUpdate = true;
    editorView.dispatch({
      changes: {
        from: 0,
        to: current.length,
        insert: next,
      },
    });
    isApplyingExternalUpdate = false;
  });

  createEffect(() => {
    const nextPath = props.path;
    if (!editorView) return;

    void (async () => {
      const languageExtension = await getLanguageExtension(nextPath);
      if (!editorView) return;
      editorView.dispatch({
        effects: languageCompartment.reconfigure(languageExtension ? [languageExtension] : []),
      });
    })();
  });

  createEffect(() => {
    const truncated = props.truncated;
    if (!editorView) return;
    editorView.dispatch({
      effects: editableCompartment.reconfigure([
        EditorState.readOnly.of(truncated),
        EditorView.editable.of(!truncated),
      ]),
    });
  });

  onCleanup(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
    editorView?.destroy();
  });

  return (
    <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div ref={containerRef} class="flex-1 min-h-0" />

      <Show when={props.truncated}>
        <div class="border-t border-border bg-muted p-1 font-mono text-xs text-muted-foreground">
          File truncated (exceeds 512KB) - editing disabled
        </div>
      </Show>
    </div>
  );
}
