import { createSignal, For } from "solid-js";

type TCommand = {
  label: string;
  value: string;
};

const commands: TCommand[] = [
  { label: "curl", value: "curl -fsSL https://vibecanvas.dev/install | bash" },
  { label: "bun", value: "bun add -g vibecanvas" },
  { label: "npm", value: "npm i -g vibecanvas" },
  { label: "pnpm", value: "pnpm add -g vibecanvas" },
  { label: "yarn", value: "yarn global add vibecanvas" },
];

export default function CommandTabs() {
  const [activeLabel, setActiveLabel] = createSignal(commands[0].label);
  const [copied, setCopied] = createSignal(false);

  const activeCommand = () =>
    commands.find((command) => command.label === activeLabel()) ?? commands[0];

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(activeCommand().value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section class="command-card">
      <div class="command-row">
        <For each={commands}>
          {(command) => (
            <button
              class={`tab-btn ${activeLabel() === command.label ? "tab-btn-active" : ""}`}
              onClick={() => setActiveLabel(command.label)}
              type="button"
            >
              {command.label}
            </button>
          )}
        </For>
      </div>

      <div class="code-row">
        <code>{activeCommand().value}</code>
        <button class="copy-btn" onClick={handleCopy} type="button">
          {copied() ? "Copied" : "Copy"}
        </button>
      </div>
    </section>
  );
}
