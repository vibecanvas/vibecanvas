/**
 * **ChatDialog** — In-chat overlay dialog with submenu navigation, search, and keyboard control.
 *
 * Renders **inside** the chat container (absolute overlay with inset padding) rather than
 * as a global browser modal, so it stays visually anchored to the chat panel.
 *
 * ## Usage
 *
 * 1. Define a `TDialogView` describing your root menu (title, items, optional search).
 * 2. Render `<ChatDialog view={myView} onClose={() => ...} />` conditionally.
 * 3. The dialog manages its own internal state (nav stack, search, selection index).
 *
 * ```tsx
 * <Show when={isOpen()}>
 *   <ChatDialog
 *     view={{
 *       id: "my-menu",
 *       title: "Pick a model",
 *       searchable: true,
 *       items: [
 *         { id: "1", label: "Claude Opus", detail: "Anthropic", section: "Popular" },
 *         { id: "2", label: "Settings", section: "Other", submenu: settingsView },
 *         { id: "3", label: "Username", inputPlaceholder: "Enter name...", onInputSubmit: (val) => save(val) },
 *       ],
 *       onSelect: (item) => console.log("picked", item.id),
 *     }}
 *     onClose={() => setIsOpen(false)}
 *   />
 * </Show>
 * ```
 *
 * ## Keyboard
 * - **Arrow Up/Down / Tab / Shift-Tab** — move selection
 * - **Enter** — activate (push submenu, fire `onAction`/`onSelect`, or submit input value)
 * - **Escape** — pop submenu, or close at root
 * - **Typing** — auto-focuses the search input (if `searchable`)
 *
 * ## Submenus
 * Set `submenu` on a `TDialogItem` to push a nested `TDialogView` onto the nav stack.
 * Esc pops back. The back-arrow indicator appears automatically.
 *
 * ## Input items
 * Set `inputPlaceholder` (and optionally `inputValue`) on a `TDialogItem` to render an
 * inline text input. `onInputSubmit(value)` fires on Enter while the input is focused.
 *
 * ## Item anatomy
 * `[indicator]  label  [input | ...detail]  [→ if submenu]`
 *
 * Register command → view mappings in `chat-dialog-commands.ts`.
 */
import { For, Show, createEffect, createMemo, createSignal, onMount } from "solid-js"

/** A single selectable row in the dialog. */
export type TDialogItem = {
  id: string
  label: string
  detail?: string
  indicator?: "dot" | "check" | null
  indicatorColor?: string
  section?: string
  submenu?: TDialogView
  onAction?: () => void
  /** If set, renders an inline text input instead of detail text. */
  inputPlaceholder?: string
  /** Pre-filled value for the inline input. */
  inputValue?: string
  /** Called with the input value when Enter is pressed on an input item. */
  onInputSubmit?: (value: string) => void
}

/** Describes one "screen" of the dialog. Push a new view via `TDialogItem.submenu`. */
export type TDialogView = {
  id: string
  title: string
  items: TDialogItem[]
  searchable?: boolean
  onSelect?: (item: TDialogItem) => void
}

type TChatDialogProps = {
  view: TDialogView
  onClose: () => void
}

export function ChatDialog(props: TChatDialogProps) {
  let wrapperRef: HTMLDivElement | undefined
  let searchRef: HTMLInputElement | undefined
  let listRef: HTMLDivElement | undefined

  const [navStack, setNavStack] = createSignal<TDialogView[]>([props.view])
  const [search, setSearch] = createSignal("")
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  /** Tracks per-item input values keyed by item id. */
  const [inputValues, setInputValues] = createSignal<Record<string, string>>({})

  const currentView = () => navStack().at(-1)!

  const filteredItems = createMemo(() => {
    const view = currentView()
    const query = search().toLowerCase().trim()
    if (!query) return view.items
    return view.items.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        (item.detail && item.detail.toLowerCase().includes(query)),
    )
  })

  const shouldShowSectionHeader = (item: TDialogItem, index: number) => {
    if (!item.section) return false
    if (index === 0) return true
    const prev = filteredItems()[index - 1]
    return prev?.section !== item.section
  }

  const scrollSelectedIntoView = (index: number) => {
    requestAnimationFrame(() => {
      const el = listRef?.querySelector(`[data-dialog-index="${index}"]`) as HTMLElement | null
      el?.scrollIntoView({ block: "nearest" })
    })
  }

  const getInputValue = (item: TDialogItem): string => {
    return inputValues()[item.id] ?? item.inputValue ?? ""
  }

  const setItemInputValue = (itemId: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [itemId]: value }))
  }

  const focusWrapper = () => {
    requestAnimationFrame(() => wrapperRef?.focus())
  }

  const focusDialog = () => {
    requestAnimationFrame(() => {
      if (currentView().searchable) {
        searchRef?.focus()
      } else {
        wrapperRef?.focus()
      }
    })
  }

  const activateItem = (item: TDialogItem) => {
    if (item.submenu) {
      setNavStack((stack) => [...stack, item.submenu!])
      setSearch("")
      setSelectedIndex(0)
      focusDialog()
      return
    }

    if (item.inputPlaceholder != null) {
      // For input items, focus the input field
      requestAnimationFrame(() => {
        const input = listRef?.querySelector(`[data-input-id="${item.id}"]`) as HTMLInputElement | null
        input?.focus()
        input?.select()
      })
      return
    }

    if (item.onAction) {
      item.onAction()
      props.onClose()
      return
    }

    currentView().onSelect?.(item)
    props.onClose()
  }

  const moveSelection = (delta: number) => {
    const items = filteredItems()
    if (items.length === 0) return
    const next = (selectedIndex() + delta + items.length) % items.length
    setSelectedIndex(next)
    scrollSelectedIntoView(next)
  }

  const goBack = () => {
    if (navStack().length > 1) {
      setNavStack((stack) => stack.slice(0, -1))
      setSearch("")
      setSelectedIndex(0)
      focusDialog()
    } else {
      props.onClose()
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    // If an inline input is focused, let it handle most keys
    const activeEl = document.activeElement
    const isInputFocused = activeEl instanceof HTMLInputElement && activeEl.dataset.inputId

    if (isInputFocused) {
      if (e.key === "Escape") {
        e.preventDefault()
        // Return focus to the wrapper so arrow keys work again
        focusWrapper()
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        const itemId = (activeEl as HTMLInputElement).dataset.inputId!
        const item = filteredItems().find((it) => it.id === itemId)
        if (item?.onInputSubmit) {
          item.onInputSubmit(getInputValue(item))
        }
        return
      }
      if (e.key === "Tab") {
        e.preventDefault()
        focusWrapper()
        moveSelection(e.shiftKey ? -1 : 1)
        return
      }
      // Let the input handle all other keys (typing, arrows within the input, etc.)
      return
    }

    switch (e.key) {
      case "ArrowDown":
      case "Tab": {
        if (e.key === "Tab" && e.shiftKey) {
          e.preventDefault()
          moveSelection(-1)
          break
        }
        e.preventDefault()
        moveSelection(1)
        break
      }
      case "ArrowUp": {
        e.preventDefault()
        moveSelection(-1)
        break
      }
      case "Enter": {
        e.preventDefault()
        const item = filteredItems()[selectedIndex()]
        if (item) activateItem(item)
        break
      }
      case "Escape": {
        e.preventDefault()
        goBack()
        break
      }
      default: {
        if (
          currentView().searchable &&
          e.key.length === 1 &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey &&
          document.activeElement !== searchRef
        ) {
          searchRef?.focus()
        }
      }
    }
  }

  const handleSearchInput = (value: string) => {
    setSearch(value)
    setSelectedIndex(0)
  }

  // Re-focus whenever the nav stack changes (fixes submenu focus)
  createEffect(() => {
    navStack() // track
    focusDialog()
  })

  onMount(() => {
    focusDialog()
  })

  return (
    <div
      ref={wrapperRef}
      class="chat-dialog-overlay"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Title bar */}
      <div class="flex items-center justify-between px-3 py-2 border-b border-border">
        <div class="flex items-center gap-2">
          <Show when={navStack().length > 1}>
            <button
              type="button"
              class="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => goBack()}
            >
              ←
            </button>
          </Show>
          <span class="text-sm text-foreground font-mono font-medium">{currentView().title}</span>
        </div>
        <button
          type="button"
          class="text-[11px] text-muted-foreground font-mono hover:text-foreground"
          onClick={() => props.onClose()}
        >
          esc
        </button>
      </div>

      {/* Search */}
      <Show when={currentView().searchable}>
        <div class="px-3 py-2 border-b border-border">
          <input
            ref={searchRef}
            type="text"
            class="w-full bg-transparent text-sm text-foreground font-mono outline-none placeholder:text-muted-foreground"
            placeholder="Search..."
            value={search()}
            onInput={(e) => handleSearchInput(e.currentTarget.value)}
          />
        </div>
      </Show>

      {/* Items list */}
      <div ref={listRef} class="flex-1 overflow-y-auto">
        <Show when={filteredItems().length === 0}>
          <div class="px-3 py-4 text-xs text-muted-foreground text-center font-mono">
            No matches
          </div>
        </Show>
        <For each={filteredItems()}>
          {(item, i) => (
            <>
              <Show when={shouldShowSectionHeader(item, i())}>
                <div class="chat-dialog-section">{item.section}</div>
              </Show>
              <div
                class="chat-dialog-item"
                classList={{ "chat-dialog-item--active": i() === selectedIndex() }}
                data-dialog-index={i()}
                onMouseEnter={() => setSelectedIndex(i())}
                onMouseDown={(e) => {
                  e.preventDefault()
                  activateItem(item)
                }}
              >
                <Show when={item.indicator}>
                  <span
                    class="chat-dialog-item-indicator"
                    style={{ color: item.indicatorColor || "var(--accent-foreground)" }}
                  >
                    {item.indicator === "dot" ? "●" : "✓"}
                  </span>
                </Show>
                <span class="chat-dialog-item-label">{item.label}</span>
                <Show
                  when={item.inputPlaceholder != null}
                  fallback={
                    <Show when={item.detail}>
                      <span class="chat-dialog-item-detail">{item.detail}</span>
                    </Show>
                  }
                >
                  <input
                    type="text"
                    class="chat-dialog-item-input"
                    data-input-id={item.id}
                    placeholder={item.inputPlaceholder}
                    value={getInputValue(item)}
                    onInput={(e) => setItemInputValue(item.id, e.currentTarget.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Show>
                <Show when={item.submenu}>
                  <span class="chat-dialog-item-arrow">→</span>
                </Show>
              </div>
            </>
          )}
        </For>
      </div>
    </div>
  )
}
