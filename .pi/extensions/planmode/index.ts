import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Key } from "@mariozechner/pi-tui";

const PLANMODE_TOOLS = ["read", "bash", "grep", "find", "ls"];
const NORMAL_TOOLS = ["read", "bash", "edit", "write", "grep", "find", "ls"];
const PLANMODE_PROMPT = "[PLANMODE: do not edit files]";
const STATE_ENTRY = "planmode-state";

export default function planmodeExtension(pi: ExtensionAPI) {
  let planMode = false;

  function syncTools() {
    pi.setActiveTools(planMode ? PLANMODE_TOOLS : NORMAL_TOOLS);
  }

  function updateUI(ctx: ExtensionContext) {
    ctx.ui.setStatus(
      "planmode",
      planMode ? ctx.ui.theme.fg("error", "PLAN") : undefined,
    );
    ctx.ui.setWidget("planmode", undefined);
  }

  function persist() {
    pi.appendEntry(STATE_ENTRY, { enabled: planMode });
  }

  function toggle(ctx: ExtensionContext) {
    planMode = !planMode;
    syncTools();
    updateUI(ctx);
    persist();
  }

  pi.registerCommand("planmode", {
    description: "Toggle plan mode",
    handler: async (_args, ctx) => toggle(ctx),
  });

  pi.registerShortcut(Key.ctrl("space"), {
    description: "Toggle plan mode",
    handler: async (ctx) => toggle(ctx),
  });

  pi.on("before_agent_start", async (event) => {
    if (!planMode) return;
    return {
      systemPrompt: `${event.systemPrompt}\n\n${PLANMODE_PROMPT}`,
    };
  });

  pi.on("tool_call", async (event) => {
    if (!planMode) return;
    if (event.toolName === "write" || event.toolName === "edit") {
      return {
        block: true,
        reason: "Plan mode is enabled: do not edit files.",
      };
    }
  });

  pi.on("session_start", async (_event, ctx) => {
    const last = ctx.sessionManager
      .getEntries()
      .filter((entry: any) => entry.type === "custom" && entry.customType === STATE_ENTRY)
      .pop() as { data?: { enabled?: boolean } } | undefined;

    planMode = last?.data?.enabled ?? false;
    syncTools();
    updateUI(ctx);
  });
}
