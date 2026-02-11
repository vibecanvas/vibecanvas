import { describe, expect, test } from "bun:test";
import fxClaudeRuntime, { type TPortal } from "./fx.claude-runtime";

function createPortal(overrides?: Partial<TPortal>): TPortal {
  return {
    fs: {
      existsSync: () => false,
      ...overrides?.fs,
    },
    process: {
      env: {},
      ...overrides?.process,
    },
    runtime: {
      which: () => null,
      isCompiled: false,
      resolveSdkCliPathForDev: () => null,
      ...overrides?.runtime,
    },
  };
}

describe("fxClaudeRuntime", () => {
  test("returns env error when explicit executable path is invalid", async () => {
    const portal = createPortal({
      process: {
        env: {
          VIBECANVAS_CLAUDE_CODE_EXECUTABLE: "/invalid/claude",
        },
      },
    });

    const [result, error] = await fxClaudeRuntime(portal, {});

    expect(error).toBeNull();
    expect(result?.available).toBe(false);
    expect(result?.source).toBe("env");
    expect(result?.reason).toContain("VIBECANVAS_CLAUDE_CODE_EXECUTABLE not found");
  });

  test("uses PATH claude binary directly without runtime executable override", async () => {
    const portal = createPortal({
      runtime: {
        which: (command) => (command === "claude" ? "/usr/local/bin/claude" : null),
      },
    });

    const [result, error] = await fxClaudeRuntime(portal, {});

    expect(error).toBeNull();
    expect(result?.available).toBe(true);
    expect(result?.source).toBe("path");
    expect(result?.options.pathToClaudeCodeExecutable).toBe("/usr/local/bin/claude");
    expect(result?.options.executable).toBeUndefined();
  });

  test("uses script executable with bun runtime when available", async () => {
    const portal = createPortal({
      fs: {
        existsSync: (target) => target === "/opt/claude/cli.js",
      },
      process: {
        env: {
          VIBECANVAS_CLAUDE_CODE_EXECUTABLE: "/opt/claude/cli.js",
        },
      },
      runtime: {
        which: (command) => (command === "bun" ? "/usr/local/bin/bun" : null),
      },
    });

    const [result, error] = await fxClaudeRuntime(portal, {});

    expect(error).toBeNull();
    expect(result?.available).toBe(true);
    expect(result?.source).toBe("env");
    expect(result?.options.pathToClaudeCodeExecutable).toBe("/opt/claude/cli.js");
    expect(result?.options.executable).toBe("bun");
  });

  test("returns unavailable when only script exists and no bun/node available", async () => {
    const portal = createPortal({
      runtime: {
        which: (command) =>
          command === "claude" ? "/usr/local/lib/claude/cli.js" : null,
      },
    });

    const [result, error] = await fxClaudeRuntime(portal, {});

    expect(error).toBeNull();
    expect(result?.available).toBe(false);
    expect(result?.reason).toContain("neither `bun` nor `node`");
  });

  test("uses sdk dev fallback only when not compiled", async () => {
    const portal = createPortal({
      runtime: {
        isCompiled: false,
        resolveSdkCliPathForDev: () => "/app/node_modules/@anthropic-ai/claude-agent-sdk/cli.js",
        which: (command) => (command === "node" ? "/usr/bin/node" : null),
      },
    });

    const [result, error] = await fxClaudeRuntime(portal, {});

    expect(error).toBeNull();
    expect(result?.available).toBe(true);
    expect(result?.source).toBe("sdk-dev");
    expect(result?.options.executable).toBe("node");
  });

  test("does not use sdk dev fallback in compiled mode", async () => {
    const portal = createPortal({
      runtime: {
        isCompiled: true,
        resolveSdkCliPathForDev: () => "/app/node_modules/@anthropic-ai/claude-agent-sdk/cli.js",
      },
    });

    const [result, error] = await fxClaudeRuntime(portal, {});

    expect(error).toBeNull();
    expect(result?.available).toBe(false);
    expect(result?.source).toBe("none");
  });
});
