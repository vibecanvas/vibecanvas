/**
 * **ChatDialog** — In-chat overlay dialog with submenu navigation, search, and keyboard control.
 *
 * Renders **inside** the chat container (absolute overlay with inset padding) rather than
 * as a global browser modal, so it stays visually anchored to the chat panel.
 *
 * ## Usage
 *
 * 1. Define a `TDialogView` describing your root menu (title, items, optional search/footer).
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
 *       ],
 *       footerHints: [{ label: "Select", shortcut: "enter" }],
 *       onSelect: (item) => console.log("picked", item.id),
 *     }}
 *     onClose={() => setIsOpen(false)}
 *   />
 * </Show>
 * ```
 *
 * ## Keyboard
 * - **Arrow Up/Down** — move selection
 * - **Enter** — activate (push submenu or fire `onAction`/`onSelect`)
 * - **Escape** — pop submenu, or close at root
 * - **Typing** — auto-focuses the search input (if `searchable`)
 *
 * ## Submenus
 * Set `submenu` on a `TDialogItem` to push a nested `TDialogView` onto the nav stack.
 * Esc pops back. The back-arrow indicator appears automatically.
 *
 * ## Item anatomy
 * `[indicator]  label  ...detail  [→ if submenu]`
 *
 * Register command → view mappings in `chat-dialog-commands.ts`.
 */
import { For, Show, createMemo, createSignal, onMount } from "solid-js"

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
}

/** A shortcut hint rendered in the dialog footer bar. */
export type TFooterHint = { label: string; shortcut: string }

/** Describes one "screen" of the dialog. Push a new view via `TDialogItem.submenu`. */
export type TDialogView = {
  id: string
  title: string
  items: TDialogItem[]
  footerHints?: TFooterHint[]
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

  const activateItem = (item: TDialogItem) => {
    if (item.submenu) {
      setNavStack((stack) => [...stack, item.submenu!])
      setSearch("")
      setSelectedIndex(0)
      requestAnimationFrame(() => {
        if (currentView().searchable) searchRef?.focus()
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

  const handleKeyDown = (e: KeyboardEvent) => {
    const items = filteredItems()

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault()
        const next = items.length > 0 ? (selectedIndex() + 1) % items.length : 0
        setSelectedIndex(next)
        scrollSelectedIntoView(next)
        break
      }
      case "ArrowUp": {
        e.preventDefault()
        const next = items.length > 0 ? (selectedIndex() - 1 + items.length) % items.length : 0
        setSelectedIndex(next)
        scrollSelectedIntoView(next)
        break
      }
      case "Enter": {
        e.preventDefault()
        const item = items[selectedIndex()]
        if (item) activateItem(item)
        break
      }
      case "Escape": {
        e.preventDefault()
        if (navStack().length > 1) {
          setNavStack((stack) => stack.slice(0, -1))
          setSearch("")
          setSelectedIndex(0)
        } else {
          props.onClose()
        }
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

  onMount(() => {
    requestAnimationFrame(() => {
      if (currentView().searchable) {
        searchRef?.focus()
      } else {
        wrapperRef?.focus()
      }
    })
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
            <span class="text-xs text-muted-foreground">←</span>
          </Show>
          <span class="text-sm text-foreground font-mono font-medium">{currentView().title}</span>
        </div>
        <span class="text-[11px] text-muted-foreground font-mono">esc</span>
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
              <button
                type="button"
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
                <Show when={item.detail}>
                  <span class="chat-dialog-item-detail">{item.detail}</span>
                </Show>
                <Show when={item.submenu}>
                  <span class="chat-dialog-item-arrow">→</span>
                </Show>
              </button>
            </>
          )}
        </For>
      </div>

      {/* Footer */}
      <Show when={currentView().footerHints && currentView().footerHints!.length > 0}>
        <div class="flex gap-4 px-3 py-2 border-t border-border text-[11px] text-muted-foreground font-mono">
          <For each={currentView().footerHints}>
            {(hint) => (
              <span>
                <span class="text-foreground">{hint.shortcut}</span>{" "}
                {hint.label}
              </span>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
