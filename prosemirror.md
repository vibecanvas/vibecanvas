# ProseMirror Chat Composer - Implementation Plan

## TOC

1. [Decisions](#decisions)
2. [Requirements](#requirements)
3. [High-Level Approach](#high-level-approach)
4. [Scope: Composer First (Tasks 1-5)](#scope-composer-first)
5. [Task 1: Add ProseMirror Dependencies](#task-1-add-prosemirror-dependencies)
6. [Task 2: Schema](#task-2-schema)
7. [Task 3: Serializer](#task-3-serializer)
8. [Task 4: Rewrite Composer](#task-4-rewrite-composer)
9. [Task 5: Image Paste Plugin + Token NodeView](#task-5-image-paste-plugin--token-nodeview)
10. [Key Code Snippets](#key-code-snippets)
11. [Data Flow](#data-flow)
12. [File Changes](#file-changes)
13. [Deferred (Phase 2)](#deferred-phase-2)

---

## Decisions

| Question | Answer |
|----------|--------|
| Framework | **Raw ProseMirror** (no tiptap) |
| Autocomplete lib | **Custom plugin** (DIY with PluginKey state + decorations) |
| Scope | **Composer first** (tasks 1-5), slash/mention menus + message rendering later |
| Node views | **Plain DOM** in NodeView constructor (no SolidJS render per token) |

---

## Requirements

- Replace `<textarea>` in `chat-input.tsx` with ProseMirror `EditorView`
- Preserve: `Enter` sends, `Shift+Enter` newline, `onInputFocus`, `canSend` gating
- Image paste -> inline `image_token` atom node (text chip `[image: filename]`)
- Hover image token -> preview tooltip (plain DOM, not Kobalte)
- Serialize ProseMirror doc -> existing `TInputPart[]` format
- Keep `chat.tsx` send flow and API contract unchanged
- Stop propagation on paste to prevent canvas handler

---

## High-Level Approach

Mount ProseMirror imperatively inside a SolidJS component using `onMount`/`onCleanup`. The editor lives in a single `<div ref={editorRef}>`. All interactivity (image paste, keymaps) is handled by ProseMirror plugins. On send, walk the PM doc and produce `TInputPart[]`.

```
┌─────────────────────────────────────────────┐
│  SolidJS Component (ChatInput)              │
│  ┌───────────────────────────────────────┐  │
│  │  ProseMirror EditorView               │  │
│  │  ├── Schema (paragraph, text,         │  │
│  │  │          hard_break, image_token)   │  │
│  │  ├── Plugins                          │  │
│  │  │   ├── history()                    │  │
│  │  │   ├── chatKeymap (Enter/Shift)     │  │
│  │  │   ├── pasteImagePlugin             │  │
│  │  │   └── baseKeymap                   │  │
│  │  └── NodeViews                        │  │
│  │      └── image_token -> ImageTokenView│  │
│  └───────────────────────────────────────┘  │
│                                             │
│  onSend() -> serialize(doc) -> TInputPart[] │
└─────────────────────────────────────────────┘
```

---

## Scope: Composer First

This plan covers tasks 1-5 only:

| # | Task | Status |
|---|------|--------|
| 1 | Add ProseMirror deps | completed |
| 2 | Schema (paragraph, text, hard_break, image_token) | completed |
| 3 | Serializer (PM doc -> TInputPart[]) | completed |
| 4 | Rewrite composer (EditorView lifecycle in SolidJS) | completed |
| 5 | Image paste plugin + image_token NodeView | completed |

---

## Task 1: Add ProseMirror Dependencies

Add to `apps/spa/package.json`:

```
prosemirror-model
prosemirror-state
prosemirror-view
prosemirror-keymap
prosemirror-commands
prosemirror-history
```

Run `bun install` from monorepo root.

**No `prosemirror-schema-basic`** -- we define our own minimal schema.

---

## Task 2: Schema

**File:** `apps/spa/src/features/chat/prosemirror/schema.ts`

Define a minimal schema with 4 node types:

```ts
doc       -> content: "paragraph+"
paragraph -> content: "inline*", group: "block"
text      -> group: "inline"
hard_break -> group: "inline", inline: true, selectable: false
image_token -> group: "inline", inline: true, atom: true
              attrs: { id, filename, mime, url }
```

### image_token NodeSpec

```ts
{
  group: "inline",
  inline: true,
  atom: true,        // not editable inside
  selectable: true,
  draggable: false,
  attrs: {
    id:       { default: "" },
    filename: { default: "" },
    mime:     { default: "" },
    url:      { default: "" },  // data URL
  },
  toDOM(node) {
    return ["span", {
      class: "image-token",
      "data-image-id": node.attrs.id,
    }, `[image: ${node.attrs.filename}]`]
  },
  parseDOM: [{
    tag: "span.image-token",
    getAttrs(dom) { ... }
  }],
}
```

Key point: `toDOM` is fallback only. We override rendering with a NodeView in task 5.

---

## Task 3: Serializer

**File:** `apps/spa/src/features/chat/prosemirror/serialize.ts`

Walk the PM doc and produce `TInputPart[]`:

```ts
export function serializeDoc(doc: Node): TInputPart[] {
  const parts: TInputPart[] = []
  let textBuffer = ""

  doc.descendants((node) => {
    if (node.isText) {
      textBuffer += node.text
    } else if (node.type.name === "hard_break") {
      textBuffer += "\n"
    } else if (node.type.name === "image_token") {
      // Flush text buffer first
      // Then push file part
      parts.push({
        type: "file",
        mime: node.attrs.mime,
        url: node.attrs.url,
        filename: node.attrs.filename,
      })
    } else if (node.type.name === "paragraph") {
      // Add newline between paragraphs (except first)
      if (textBuffer.length > 0) textBuffer += "\n"
      return true  // descend into children
    }
  })

  // Flush remaining text
  if (textBuffer.trim()) {
    parts.push({ type: "text", text: textBuffer.trim() })
  }

  return parts
}
```

**Ordering:** File parts first, then text (matches current `handleSend` behavior where images are pushed before text).

Actually, re-reading the current code -- images go first, text last. The serializer should collect file parts separately and text separately, then return `[...fileParts, ...textParts]` to maintain the same ordering contract.

---

## Task 4: Rewrite Composer

**File:** Modify `apps/spa/src/features/chat/components/chat-input.tsx`

### Lifecycle

```ts
export function ChatInput(props: TChatInputProps) {
  let editorRef: HTMLDivElement | undefined
  let view: EditorView | undefined

  onMount(() => {
    const state = EditorState.create({
      schema: chatSchema,
      plugins: [
        history(),
        keymap(chatKeymap(handleSend)),
        pasteImagePlugin(),
        keymap(baseKeymap),
      ],
    })

    view = new EditorView(editorRef!, {
      state,
      dispatchTransaction(tr) {
        const newState = view!.state.apply(tr)
        view!.updateState(newState)
      },
      nodeViews: {
        image_token: (node, view, getPos) =>
          new ImageTokenNodeView(node, view, getPos),
      },
    })

    view.focus()
  })

  onCleanup(() => {
    view?.destroy()
  })

  // ... handleSend, render
}
```

### Chat Keymap

```ts
function chatKeymap(onSubmit: () => void) {
  return {
    "Enter": (state, dispatch) => {
      // Empty doc check
      if (state.doc.textContent.trim() === "" && !hasImageTokens(state.doc))
        return true  // consume but don't send

      onSubmit()
      return true
    },
    "Shift-Enter": (state, dispatch) => {
      // Insert hard_break node
      const br = state.schema.nodes.hard_break
      if (dispatch) dispatch(state.tr.replaceSelectionWith(br.create()))
      return true
    },
    "Mod-z": undo,
    "Mod-Shift-z": redo,
  }
}
```

### Send Flow

```ts
const handleSend = () => {
  if (!props.canSend || !view) return

  const parts = serializeDoc(view.state.doc)
  if (parts.length === 0) return

  props.onSend(parts)

  // Clear editor
  const tr = view.state.tr.delete(0, view.state.doc.content.size)
  view.dispatch(tr)
  view.focus()
}
```

### What Gets Removed

- `createSignal` for `text` and `pendingImages` -- PM state replaces both
- `handlePaste` function -- replaced by `pasteImagePlugin`
- `handleKeyDown` function -- replaced by keymap plugin
- `<textarea>` element -- replaced by `<div ref={editorRef}>`
- `ImageBadge` component -- replaced by `ImageTokenNodeView`

### What Stays

- `TInputPart` type export
- `SUPPORTED_IMAGE_TYPES` constant
- `fileToDataUrl` helper
- `generateId` helper
- Props interface shape (`canSend`, `onSend`, `onInputFocus`)

### Focus Handling

Call `props.onInputFocus?.()` by listening to EditorView's `focus` DOM event:

```ts
editorRef.addEventListener("focus", () => props.onInputFocus?.(), true)
```

Use `capture: true` since PM's contenteditable div is a child.

### Stop Propagation on Paste

The paste plugin must call `event.stopPropagation()` to prevent the canvas paste handler from firing -- same as current textarea behavior.

---

## Task 5: Image Paste Plugin + Token NodeView

### Paste Plugin

**File:** `apps/spa/src/features/chat/prosemirror/plugins/paste-image.ts`

```ts
export function pasteImagePlugin() {
  return new Plugin({
    props: {
      handleDOMEvents: {
        paste(view, event) {
          event.stopPropagation()  // prevent canvas handler

          const files = event.clipboardData?.files
          if (!files?.length) return false

          const imageFiles = Array.from(files).filter(
            f => SUPPORTED_IMAGE_TYPES.has(f.type)
          )
          if (!imageFiles.length) return false

          event.preventDefault()

          for (const file of imageFiles) {
            processImageFile(file, view)
          }
          return true
        },
      },
    },
  })
}

async function processImageFile(file: File, view: EditorView) {
  const dataUrl = await fileToDataUrl(file)
  const id = generateId()
  const filename = file.name || `image.${file.type.split("/")[1]}`

  const node = view.state.schema.nodes.image_token.create({
    id, filename, mime: file.type, url: dataUrl,
  })

  const tr = view.state.tr.replaceSelectionWith(node)
  view.dispatch(tr)
}
```

### Image Token NodeView

**File:** `apps/spa/src/features/chat/prosemirror/nodeviews/image-token-view.ts`

Plain DOM construction. Chip style with hover preview.

```ts
export class ImageTokenNodeView {
  dom: HTMLSpanElement
  private tooltip: HTMLDivElement | null = null

  constructor(
    private node: ProseMirrorNode,
    private editorView: EditorView,
    private getPos: () => number | undefined,
  ) {
    this.dom = document.createElement("span")
    this.dom.className = "image-token-chip"
    this.dom.contentEditable = "false"

    // Icon + filename text
    const label = document.createElement("span")
    label.className = "image-token-label"
    label.textContent = `[image: ${node.attrs.filename}]`
    this.dom.appendChild(label)

    // Remove button (x)
    const removeBtn = document.createElement("span")
    removeBtn.className = "image-token-remove"
    removeBtn.textContent = "×"
    removeBtn.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      const pos = this.getPos()
      if (pos != null) {
        const tr = this.editorView.state.tr.delete(pos, pos + 1)
        this.editorView.dispatch(tr)
      }
    })
    this.dom.appendChild(removeBtn)

    // Hover preview
    this.dom.addEventListener("mouseenter", this.showPreview)
    this.dom.addEventListener("mouseleave", this.hidePreview)
  }

  private showPreview = () => {
    if (this.tooltip) return
    this.tooltip = document.createElement("div")
    this.tooltip.className = "image-token-tooltip"

    const img = document.createElement("img")
    img.src = this.node.attrs.url
    img.style.maxWidth = "200px"
    img.style.maxHeight = "150px"
    img.style.objectFit = "contain"
    this.tooltip.appendChild(img)

    // Position above the chip
    const rect = this.dom.getBoundingClientRect()
    this.tooltip.style.position = "fixed"
    this.tooltip.style.left = `${rect.left}px`
    this.tooltip.style.top = `${rect.top - 8}px`
    this.tooltip.style.transform = "translateY(-100%)"
    this.tooltip.style.zIndex = "50"

    document.body.appendChild(this.tooltip)
  }

  private hidePreview = () => {
    if (this.tooltip) {
      this.tooltip.remove()
      this.tooltip = null
    }
  }

  update(node: ProseMirrorNode) {
    if (node.type !== this.node.type) return false
    this.node = node
    return true
  }

  stopEvent() { return false }

  destroy() {
    this.hidePreview()
    this.dom.removeEventListener("mouseenter", this.showPreview)
    this.dom.removeEventListener("mouseleave", this.hidePreview)
  }
}
```

### CSS for Image Tokens

Add to `apps/spa/src/index.css` or a new `prosemirror.css`:

```css
/* ProseMirror editor in chat */
.ProseMirror {
  outline: none;
  min-height: 1.5em;
  max-height: 120px;
  overflow-y: auto;
  padding: 8px;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.ProseMirror p {
  margin: 0;
}

/* Image token chip */
.image-token-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px;
  background: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-default, #d4d4d4);
  font-size: 0.75rem;
  vertical-align: baseline;
  cursor: default;
  user-select: none;
}

.image-token-label {
  color: var(--text-secondary, #525252);
}

.image-token-remove {
  cursor: pointer;
  color: var(--text-muted, #737373);
  font-size: 0.875rem;
  line-height: 1;
}

.image-token-remove:hover {
  color: var(--accent-danger, #dc2626);
}

/* Tooltip preview */
.image-token-tooltip {
  padding: 4px;
  background: var(--bg-primary, #fafafa);
  border: 1px solid var(--border-default, #d4d4d4);
  box-shadow: var(--shadow-md);
}
```

---

## Key Code Snippets

### Helper: Check if doc has image tokens

```ts
function hasImageTokens(doc: Node): boolean {
  let found = false
  doc.descendants((node) => {
    if (node.type.name === "image_token") {
      found = true
      return false  // stop traversal
    }
  })
  return found
}
```

### Helper: Check if doc is empty

```ts
function isDocEmpty(doc: Node): boolean {
  return doc.textContent.trim() === "" && !hasImageTokens(doc)
}
```

---

## Data Flow

```
Paste image
  ↓
pasteImagePlugin intercepts ClipboardEvent
  ↓
stopPropagation() (prevents canvas handler)
  ↓
FileReader -> data URL
  ↓
Insert image_token node into PM doc
  ↓
ImageTokenNodeView renders chip: [image: photo.png] ×
  ↓
User hovers -> plain DOM tooltip with <img> preview
  ↓
User presses Enter
  ↓
chatKeymap "Enter" handler fires
  ↓
handleSend() called
  ↓
serializeDoc(view.state.doc) -> TInputPart[]
  ↓
  ├── { type: "file", mime: "image/png", url: "data:...", filename: "photo.png" }
  └── { type: "text", text: "check this out" }
  ↓
props.onSend(parts)
  ↓
chat.tsx sendMessage (unchanged)
  ↓
api.ai.prompt({ chatId, parts })
```

---

## File Changes

| Action | File |
|--------|------|
| Modify | `apps/spa/package.json` (add prosemirror deps) |
| Modify | `apps/spa/src/features/chat/components/chat-input.tsx` (rewrite) |
| Modify | `apps/spa/src/index.css` (add PM + token styles) |
| Add | `apps/spa/src/features/chat/prosemirror/schema.ts` |
| Add | `apps/spa/src/features/chat/prosemirror/serialize.ts` |
| Add | `apps/spa/src/features/chat/prosemirror/plugins/paste-image.ts` |
| Add | `apps/spa/src/features/chat/prosemirror/nodeviews/image-token-view.ts` |

**No changes to:**
- `chat.tsx` (send flow stays the same, already accepts `TInputPart[]`)
- `chat-message.tsx` (deferred to phase 2)
- API contract / backend

---

## Deferred (Phase 2)

These tasks are intentionally out of scope for this phase:

| # | Task | Notes |
|---|------|-------|
| 6 | Slash command menu (`/`) | Custom plugin + Kobalte popover, static commands |
| 7 | Mention menu (`@`) | Custom plugin + Kobalte popover, static files |
| 8 | Message rendering rewrite | Token-style rendering for file/image parts in chat-message.tsx |
| 9 | CLAUDE.md update | Document PM architecture after phase 1 stabilizes |

---

## Phase 2 Progress Update (2026-02-23)

User requested autocomplete menus for `@` and `/` immediately after phase 1.

Implemented now:

- `@` mention menu in composer using inline trigger detection from current cursor context
  - Backed by real file suggestions loaded from chat `local_path` via `api.file.files`
  - Flattens nested tree nodes to file rows and limits menu size for responsiveness
- `/` slash menu in composer
  - Uses a lightweight static command list for now (`/fix`, `/plan`, `/explain`, `/test`, `/review`)
- Keyboard interaction support while menu is open:
  - `ArrowUp` / `ArrowDown` to navigate
  - `Enter` / `Tab` to accept
  - `Escape` to dismiss
- Selection inserts normalized text token and keeps editor focused
- Follow-up UX tweak:
  - Increased vertical anchor offset so menu renders under the active text line
  - Added auto-scroll behavior for keyboard navigation so active item is always visible inside menu viewport

Files touched for phase 2 progress:

- `apps/spa/src/features/chat/components/chat-input.tsx`
  - Added trigger parsing, autocomplete state, menu render, and keyboard handling
- `apps/spa/src/features/chat/components/chat.tsx`
  - Added file suggestion loading from current chat folder
- `apps/spa/src/index.css`
  - Added autocomplete menu styles matching current sharp-edge design language

What remains from original deferred notes:

- Kobalte popover integration is still deferred (current implementation uses plain DOM/Solid markup)
- Slash commands are still static placeholders and not wired to command execution semantics

---

## Execution Notes

- ProseMirror CSS import: may need `import "prosemirror-view/style/prosemirror.css"` in the component or global CSS. Check if Vite handles this.
- The `contenteditable` div must have `tabindex` or focus management for `onInputFocus` to work.
- `baseKeymap` must come **after** custom keymap in plugins array (first match wins).
- For the image paste async flow: the plugin starts sync (returns `true` to consume event), then dispatches the transaction asynchronously after FileReader completes. This is safe because `view.dispatch` works anytime.

### Implementation Update (2026-02-23)

- Implemented deps in `apps/spa/package.json`:
  - `prosemirror-model`, `prosemirror-state`, `prosemirror-view`, `prosemirror-keymap`, `prosemirror-commands`, `prosemirror-history`
- Added schema: `apps/spa/src/features/chat/prosemirror/schema.ts`
- Added serializer: `apps/spa/src/features/chat/prosemirror/serialize.ts`
  - Preserves compatibility ordering: `file` parts are emitted before `text`
  - Text is collected from paragraph/hard_break structure and emitted as one `text` part when non-empty
- Rewrote composer in `apps/spa/src/features/chat/components/chat-input.tsx`
  - Replaced textarea/signals with ProseMirror `EditorView`
  - Preserved behavior: `Enter` send, `Shift+Enter` newline, `canSend` gating, `onInputFocus`
  - Added placeholder plugin so empty editor still shows `Type your message...`
- Added image paste plugin: `apps/spa/src/features/chat/prosemirror/plugins/paste-image.ts`
  - Calls `stopPropagation()` on paste to avoid canvas-level paste handler
  - Handles async FileReader flow and inserts `image_token` nodes
- Added token node view: `apps/spa/src/features/chat/prosemirror/nodeviews/image-token-view.ts`
  - Plain DOM chip, remove button, hover image tooltip
  - Tooltip includes viewport clamping to avoid off-screen positioning
- Added styles in `apps/spa/src/index.css`
  - `.ProseMirror` editor, placeholder, image token chip, remove button, tooltip image
