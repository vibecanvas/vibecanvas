import { baseKeymap } from "prosemirror-commands"
import { history, redo, undo } from "prosemirror-history"
import type { Node as ProseMirrorNode } from "prosemirror-model"
import { Plugin } from "prosemirror-state"
import { EditorState } from "prosemirror-state"
import { keymap } from "prosemirror-keymap"
import { EditorView } from "prosemirror-view"
import { For, Show, createSignal, onCleanup, onMount } from "solid-js"
import { showErrorToast } from "@/components/ui/Toast"
import { toRelativePathWithinBase } from "@/utils/path-display"
import { ImageTokenNodeView } from "../prosemirror/nodeviews/image-token-view"
import { pasteImagePlugin } from "../prosemirror/plugins/paste-image"
import { chatSchema } from "../prosemirror/schema"
import { serializeDoc } from "../prosemirror/serialize"

export type TInputPart =
  | { type: "text"; text: string }
  | { type: "file"; mime: string; url: string; filename?: string }

type TChatInputProps = {
  canSend: boolean
  onSend: (content: TInputPart[]) => void
  onInputFocus?: () => void
  onFileSearch?: (query: string, options?: { limit?: number }) => Promise<TFileSuggestion[]>
  onFileSuggestionUsed?: (path: string) => void
  workingDirectoryPath?: string | null
}

type TFileSuggestion = {
  name: string
  path: string
  isDirectory: boolean
}

type TAutocompleteMatch = {
  trigger: "@" | "/"
  from: number
  to: number
  query: string
}

type TAutocompleteItem = {
  key: string
  label: string
  detail: string
  value: string
}

type TAutocompleteState = {
  open: boolean
  trigger: "@" | "/" | null
  from: number
  to: number
  query: string
  selectedIndex: number
  left: number
  top: number
  items: TAutocompleteItem[]
}

const MAX_AUTOCOMPLETE_ITEMS = 10
const AUTOCOMPLETE_VERTICAL_OFFSET = 10
const FILE_SEARCH_DEBOUNCE_MS = 180
const FILETREE_DND_MIME = "application/x-vibecanvas-filetree-node"

const COMMAND_SUGGESTIONS: TAutocompleteItem[] = [
  { key: "fix", label: "/fix", detail: "Ask assistant to fix current issue", value: "fix" },
  { key: "plan", label: "/plan", detail: "Ask assistant to draft an implementation plan", value: "plan" },
  { key: "explain", label: "/explain", detail: "Ask assistant to explain selected code", value: "explain" },
  { key: "test", label: "/test", detail: "Ask assistant to add or run tests", value: "test" },
  { key: "review", label: "/review", detail: "Ask assistant to review current changes", value: "review" },
]

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
])

function hasFiletreeDragPayload(event: DragEvent): boolean {
  const types = event.dataTransfer?.types
  if (!types) return false
  return Array.from(types).includes(FILETREE_DND_MIME)
}

function parseDroppedFiletreePath(event: DragEvent): string | null {
  const transfer = event.dataTransfer
  if (!transfer) return null

  const raw = transfer.getData(FILETREE_DND_MIME)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { path?: unknown }
      if (typeof parsed.path === "string" && parsed.path.length > 0) {
        return parsed.path
      }
    } catch {
      // fallback to text/plain
    }
  }

  const fallback = transfer.getData("text/plain")
  if (!fallback || !fallback.startsWith("@")) return null
  const path = fallback.slice(1).trim()
  return path.length > 0 ? path : null
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as string)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function generateId(): string {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function hasImageTokens(doc: ProseMirrorNode): boolean {
  let found = false
  doc.descendants((node) => {
    if (node.type.name === "image_token") {
      found = true
      return false
    }
    return true
  })
  return found
}

function isDocEmpty(doc: ProseMirrorNode): boolean {
  return doc.textContent.trim() === "" && !hasImageTokens(doc)
}

function placeholderPlugin(placeholder: string) {
  return new Plugin({
    view(editorView) {
      const applyPlaceholder = () => {
        if (isDocEmpty(editorView.state.doc)) {
          editorView.dom.setAttribute("data-placeholder", placeholder)
        } else {
          editorView.dom.removeAttribute("data-placeholder")
        }
      }

      applyPlaceholder()

      return {
        update: applyPlaceholder,
        destroy() {
          editorView.dom.removeAttribute("data-placeholder")
        },
      }
    },
  })
}

function clearEditor(view: EditorView) {
  const emptyParagraph = chatSchema.nodes.paragraph.createAndFill()
  if (!emptyParagraph) return

  const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, emptyParagraph)
  view.dispatch(tr)
}

function emptyAutocompleteState(): TAutocompleteState {
  return {
    open: false,
    trigger: null,
    from: 0,
    to: 0,
    query: "",
    selectedIndex: 0,
    left: 0,
    top: 0,
    items: [],
  }
}

function getAutocompleteMatch(view: EditorView): TAutocompleteMatch | null {
  const { state } = view
  const { selection } = state
  if (!selection.empty) return null

  const { $from } = selection
  if (!$from.parent.isTextblock) return null

  const textBefore = $from.parent.textBetween(0, $from.parentOffset, "\n", "\n")
  const match = /(^|\s)([@/])([^\s@/]*)$/.exec(textBefore)
  if (!match) return null

  const leadingSpaceLength = match[1]?.length ?? 0
  const trigger = match[2] as "@" | "/"
  const query = match[3] ?? ""
  const parentStart = $from.start()
  const from = parentStart + (match.index ?? 0) + leadingSpaceLength
  const to = $from.pos

  return { trigger, from, to, query }
}

function sortByRelevance(items: TAutocompleteItem[], query: string): TAutocompleteItem[] {
  if (!query) return items

  const lower = query.toLowerCase()

  return [...items].sort((a, b) => {
    const aLabel = a.label.toLowerCase()
    const bLabel = b.label.toLowerCase()
    const aStarts = aLabel.startsWith(lower) ? 0 : 1
    const bStarts = bLabel.startsWith(lower) ? 0 : 1
    if (aStarts !== bStarts) return aStarts - bStarts
    return aLabel.localeCompare(bLabel)
  })
}

function buildCommandAutocompleteItems(query: string): TAutocompleteItem[] {
  const commandQuery = query.toLowerCase()
  const filtered = COMMAND_SUGGESTIONS.filter((item) => {
    if (!commandQuery) return true
    return item.label.toLowerCase().includes(commandQuery)
  })
  return sortByRelevance(filtered, commandQuery).slice(0, MAX_AUTOCOMPLETE_ITEMS)
}

function normalizeSuggestionPath(path: string, workingDirectoryPath: string | null): string | null {
  const normalizedPath = path.trim().replaceAll("\\", "/")
  if (!normalizedPath) return null

  const isAbsolute = normalizedPath.startsWith("/") || /^[A-Za-z]:\//.test(normalizedPath)
  if (isAbsolute) {
    return toRelativePathWithinBase(normalizedPath, workingDirectoryPath)
  }

  if (normalizedPath === ".") return "."

  const stripped = normalizedPath.replace(/^\.\//, "").replace(/^\/+/, "")
  return stripped.length > 0 ? stripped : null
}

function buildFileAutocompleteItems(
  fileSuggestions: TFileSuggestion[],
  workingDirectoryPath: string | null,
): TAutocompleteItem[] {
  const fileItems = fileSuggestions
    .map((file) => {
      const relativePath = normalizeSuggestionPath(file.path, workingDirectoryPath)
      if (!relativePath) return null

      const displayPath = file.isDirectory && !relativePath.endsWith("/")
        ? `${relativePath}/`
        : relativePath

      return {
        key: `${file.isDirectory ? "d" : "f"}:${file.path}`,
        label: `@${displayPath}`,
        detail: file.isDirectory ? `${relativePath} (dir)` : relativePath,
        value: displayPath,
      }
    })
    .filter((item): item is TAutocompleteItem => item !== null)

  return fileItems.slice(0, MAX_AUTOCOMPLETE_ITEMS)
}

export function ChatInput(props: TChatInputProps) {
  let editorRef: HTMLDivElement | undefined
  let menuRef: HTMLDivElement | undefined
  let view: EditorView | undefined
  let fileSearchTimer: ReturnType<typeof setTimeout> | undefined
  let fileSearchRequestId = 0
  const [autocomplete, setAutocomplete] = createSignal<TAutocompleteState>(emptyAutocompleteState())
  const [isFiletreeDragOver, setIsFiletreeDragOver] = createSignal(false)

  const ensureSelectedItemVisible = (selectedIndex: number) => {
    if (!menuRef) return

    requestAnimationFrame(() => {
      const active = menuRef?.querySelector(
        `[data-autocomplete-index="${selectedIndex}"]`,
      ) as HTMLElement | null
      active?.scrollIntoView({ block: "nearest" })
    })
  }

  const clearFileSearchTimer = () => {
    if (!fileSearchTimer) return
    clearTimeout(fileSearchTimer)
    fileSearchTimer = undefined
  }

  const closeAutocomplete = () => {
    clearFileSearchTimer()
    fileSearchRequestId += 1
    setAutocomplete(emptyAutocompleteState())
  }

  const updateAutocomplete = () => {
    if (!view || !editorRef) {
      closeAutocomplete()
      return
    }

    const match = getAutocompleteMatch(view)
    if (!match) {
      closeAutocomplete()
      return
    }

    if (match.trigger === "/") {
      clearFileSearchTimer()

      const items = buildCommandAutocompleteItems(match.query)
      if (items.length === 0) {
        closeAutocomplete()
        return
      }

      const coords = view.coordsAtPos(match.to)
      const hostRect = editorRef.getBoundingClientRect()

      setAutocomplete((prev) => ({
        open: true,
        trigger: match.trigger,
        from: match.from,
        to: match.to,
        query: match.query,
        selectedIndex: Math.min(prev.selectedIndex, items.length - 1),
        left: Math.max(0, coords.left - hostRect.left),
        top: Math.max(0, coords.bottom - hostRect.top + AUTOCOMPLETE_VERTICAL_OFFSET),
        items,
      }))

      ensureSelectedItemVisible(Math.min(autocomplete().selectedIndex, items.length - 1))
      return
    }

    if (!props.onFileSearch) {
      closeAutocomplete()
      return
    }

    const requestId = ++fileSearchRequestId
    clearFileSearchTimer()

    fileSearchTimer = setTimeout(async () => {
      if (!view || !editorRef) return

      const activeMatch = getAutocompleteMatch(view)
      if (!activeMatch || activeMatch.trigger !== "@") {
        if (requestId === fileSearchRequestId) {
          setAutocomplete(emptyAutocompleteState())
        }
        return
      }

      const fileSuggestions = await props.onFileSearch?.(activeMatch.query, {
        limit: MAX_AUTOCOMPLETE_ITEMS,
      })
      if (requestId !== fileSearchRequestId || !fileSuggestions) return

      const latestMatch = getAutocompleteMatch(view)
      if (!latestMatch || latestMatch.trigger !== "@") {
        if (requestId === fileSearchRequestId) {
          setAutocomplete(emptyAutocompleteState())
        }
        return
      }

      const items = buildFileAutocompleteItems(
        fileSuggestions,
        props.workingDirectoryPath ?? null,
      )

      if (items.length === 0) {
        if (requestId === fileSearchRequestId) {
          setAutocomplete(emptyAutocompleteState())
        }
        return
      }

      const coords = view.coordsAtPos(latestMatch.to)
      const hostRect = editorRef.getBoundingClientRect()

      setAutocomplete((prev) => ({
        open: true,
        trigger: latestMatch.trigger,
        from: latestMatch.from,
        to: latestMatch.to,
        query: latestMatch.query,
        selectedIndex: Math.min(prev.selectedIndex, items.length - 1),
        left: Math.max(0, coords.left - hostRect.left),
        top: Math.max(0, coords.bottom - hostRect.top + AUTOCOMPLETE_VERTICAL_OFFSET),
        items,
      }))

      ensureSelectedItemVisible(Math.min(autocomplete().selectedIndex, items.length - 1))
    }, FILE_SEARCH_DEBOUNCE_MS)
  }

  const moveAutocompleteSelection = (delta: number) => {
    const state = autocomplete()
    if (!state.open || state.items.length === 0) return

    const next = (state.selectedIndex + delta + state.items.length) % state.items.length
    setAutocomplete({ ...state, selectedIndex: next })
    ensureSelectedItemVisible(next)
  }

  const selectAutocompleteItem = (index?: number) => {
    if (!view) return false

    const state = autocomplete()
    if (!state.open || !state.trigger) return false

    const targetIndex = index ?? state.selectedIndex
    const item = state.items[targetIndex]
    if (!item) return false

    const replacement = `${state.trigger}${item.value} `
    const tr = view.state.tr.insertText(replacement, state.from, state.to)
    view.dispatch(tr)

    if (state.trigger === "@") {
      props.onFileSuggestionUsed?.(item.value)
    }

    closeAutocomplete()
    view.focus()
    return true
  }

  const insertMention = (path: string, pos?: number) => {
    if (!view) return false

    const mentionText = `@${path} `
    const { from, to } = view.state.selection
    const tr = typeof pos === "number"
      ? view.state.tr.insertText(mentionText, pos, pos)
      : view.state.tr.insertText(mentionText, from, to)

    view.dispatch(tr.scrollIntoView())

    props.onFileSuggestionUsed?.(path)

    closeAutocomplete()
    view.focus()
    return true
  }

  const handleSend = () => {
    if (!props.canSend || !view) return

    const parts = serializeDoc(view.state.doc)
    if (parts.length === 0) return

    props.onSend(parts)
    clearEditor(view)
    closeAutocomplete()
    view.focus()
  }

  onMount(() => {
    if (!editorRef) return

    const chatKeys = keymap({
      Enter: () => {
        if (autocomplete().open) {
          selectAutocompleteItem()
          return true
        }

        if (!view) return true
        if (isDocEmpty(view.state.doc)) return true

        handleSend()
        return true
      },
      ArrowDown: () => {
        if (!autocomplete().open) return false
        moveAutocompleteSelection(1)
        return true
      },
      ArrowUp: () => {
        if (!autocomplete().open) return false
        moveAutocompleteSelection(-1)
        return true
      },
      Tab: () => {
        if (!autocomplete().open) return false
        selectAutocompleteItem()
        return true
      },
      Escape: () => {
        if (!autocomplete().open) return false
        closeAutocomplete()
        return true
      },
      "Shift-Enter": (state, dispatch) => {
        const hardBreak = state.schema.nodes.hard_break
        if (dispatch) {
          dispatch(state.tr.replaceSelectionWith(hardBreak.create()).scrollIntoView())
        }
        return true
      },
      "Mod-z": undo,
      "Mod-Shift-z": redo,
    })

    const state = EditorState.create({
      schema: chatSchema,
      plugins: [
        history(),
        chatKeys,
        pasteImagePlugin({
          supportedImageTypes: SUPPORTED_IMAGE_TYPES,
          fileToDataUrl,
          generateId,
        }),
        placeholderPlugin("Type your message..."),
        keymap(baseKeymap),
      ],
    })

    view = new EditorView(editorRef, {
      state,
      dispatchTransaction(transaction) {
        if (!view) return
        const newState = view.state.apply(transaction)
        view.updateState(newState)
        updateAutocomplete()
      },
      handleDOMEvents: {
        focus: () => {
          props.onInputFocus?.()
          return false
        },
        blur: () => {
          closeAutocomplete()
          setIsFiletreeDragOver(false)
          return false
        },
        dragenter: (_, event) => {
          const dragEvent = event as DragEvent
          if (!hasFiletreeDragPayload(dragEvent)) return false
          setIsFiletreeDragOver(true)
          return false
        },
        dragover: (_, event) => {
          const dragEvent = event as DragEvent
          if (!hasFiletreeDragPayload(dragEvent)) return false
          dragEvent.preventDefault()
          if (dragEvent.dataTransfer) {
            dragEvent.dataTransfer.dropEffect = "copy"
          }
          setIsFiletreeDragOver(true)
          return true
        },
        dragleave: (_, event) => {
          const dragEvent = event as DragEvent
          if (!hasFiletreeDragPayload(dragEvent)) return false
          const nextTarget = dragEvent.relatedTarget as Node | null
          if (editorRef && nextTarget && editorRef.contains(nextTarget)) {
            return false
          }
          setIsFiletreeDragOver(false)
          return false
        },
        drop: (_, event) => {
          const dragEvent = event as DragEvent
          const droppedPath = parseDroppedFiletreePath(dragEvent)
          if (!droppedPath) {
            setIsFiletreeDragOver(false)
            return false
          }

          dragEvent.preventDefault()
          const coords = view?.posAtCoords({ left: dragEvent.clientX, top: dragEvent.clientY })
          const relativePath = toRelativePathWithinBase(droppedPath, props.workingDirectoryPath ?? null)
          if (!relativePath) {
            showErrorToast(
              "Path outside chat folder",
              "You can only reference files inside this chat folder.",
            )
            setIsFiletreeDragOver(false)
            return true
          }

          const inserted = insertMention(relativePath, coords?.pos)
          setIsFiletreeDragOver(false)
          return inserted
        },
        dragend: () => {
          setIsFiletreeDragOver(false)
          return false
        },
      },
      nodeViews: {
        image_token: (node, editorView, getPos) => new ImageTokenNodeView(node, editorView, getPos),
      },
    })

    updateAutocomplete()
  })

  onCleanup(() => {
    clearFileSearchTimer()
    view?.destroy()
    view = undefined
  })

  return (
    <div class="relative border-t border-border">
      <div
        ref={editorRef}
        class="chat-composer-root w-full p-2"
        classList={{ "chat-composer-root--drop-target": isFiletreeDragOver() }}
      />
      <Show when={autocomplete().open}>
        <div
          ref={menuRef}
          class="chat-autocomplete"
          style={{
            left: `${autocomplete().left}px`,
            top: `${autocomplete().top}px`,
          }}
        >
          <For each={autocomplete().items}>
            {(item, index) => (
              <button
                type="button"
                class="chat-autocomplete-item"
                data-autocomplete-index={String(index())}
                classList={{ "chat-autocomplete-item--active": index() === autocomplete().selectedIndex }}
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectAutocompleteItem(index())
                }}
              >
                <span class="chat-autocomplete-item-label">{item.label}</span>
                <span class="chat-autocomplete-item-detail">{item.detail}</span>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
