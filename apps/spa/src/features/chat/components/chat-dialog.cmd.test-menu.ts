import type { TDialogView } from "./chat-dialog"

export default function createTestMenuView(): TDialogView {
  return {
    id: "test-menu-root",
    title: "Test Menu",
    searchable: true,
    items: [
      { id: "r1", label: "Claude Opus 4.5", detail: "Anthropic", indicator: "dot", indicatorColor: "var(--accent-foreground)", section: "Recent" },
      { id: "r2", label: "GPT-5.3 Codex", detail: "OpenAI", section: "Recent" },
      { id: "r3", label: "Kimi K2.5", detail: "Kimi For Coding", section: "Recent" },
      { id: "a1", label: "GLM-4.7", detail: "Z.AI Coding Plan", section: "All" },
      { id: "a2", label: "GLM-5", detail: "Z.AI Coding Plan", section: "All" },
      { id: "a3", label: "MiniMax-M2.5", detail: "MiniMax Coding Plan", section: "All" },
      { id: "a4", label: "Claude Sonnet 4.5", detail: "Anthropic", section: "All" },
      { id: "a5", label: "Gemini 2.5 Pro", detail: "Google", section: "All" },
      {
        id: "s1",
        label: "Theme",
        detail: "Light / Dark / System",
        section: "Settings",
        submenu: {
          id: "theme-sub",
          title: "Theme",
          items: [
            { id: "t1", label: "Light", detail: "Default light theme", indicator: "dot", indicatorColor: "var(--accent-foreground)", onAction: () => {} },
            { id: "t2", label: "Dark", detail: "Dark terminal theme", onAction: () => {} },
            { id: "t3", label: "System", detail: "Follow OS preference", onAction: () => {} },
          ],
        },
      },
      {
        id: "s2",
        label: "Username",
        section: "Settings",
        inputPlaceholder: "Enter username...",
        inputValue: "vibedev",
        onInputSubmit: (value) => {
          console.log("[test-menu] username submitted:", value)
        },
      },
      { id: "s3", label: "Connect Provider", detail: "Add API key", section: "Settings", onAction: () => {} },
    ],
  }
}
