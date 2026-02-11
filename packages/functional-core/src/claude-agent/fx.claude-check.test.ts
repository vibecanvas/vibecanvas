import { describe, expect, test } from "bun:test";
import type { AccountInfo, query as sdkQuery } from "@anthropic-ai/claude-agent-sdk";
import fxClaudeCheck, {
  fxClaudeCheckAuth,
  fxClaudeCheckInstalled,
} from "./fx.claude-check";

type TQueryResult = {
  accountInfo: () => Promise<AccountInfo>;
  close: () => void;
};

type TMockPortal = {
  claudeAgentSdk: {
    query: typeof sdkQuery;
  };
};

function createPortal(accountInfo: () => Promise<AccountInfo>): TMockPortal {
  return {
    claudeAgentSdk: {
      query: (() =>
        ({
          accountInfo,
          close: () => {},
        }) as unknown as TQueryResult) as unknown as typeof sdkQuery,
    },
  };
}

describe("fxClaudeCheck", () => {
  test("returns installed + subscription auth when token source exists", async () => {
    const portal = createPortal(async () => ({
      email: "dev@example.com",
      organization: "acme",
      subscriptionType: "pro",
      tokenSource: "user",
    }));

    const [result, error] = await fxClaudeCheck(portal, {});

    expect(error).toBeNull();
    expect(result?.install.isInstalled).toBe(true);
    expect(result?.auth.isAuthenticated).toBe(true);
    expect(result?.auth.authType).toBe("subscription");
    expect(result?.auth.subscriptionType).toBe("pro");
  });

  test("returns api auth when api key source exists", async () => {
    const portal = createPortal(async () => ({
      apiKeySource: "user",
    }));

    const [result, error] = await fxClaudeCheckAuth(portal, {});

    expect(error).toBeNull();
    expect(result?.isAuthenticated).toBe(true);
    expect(result?.authType).toBe("api");
    expect(result?.apiKeySource).toBe("user");
  });

  test("returns not authenticated when auth error is detected", async () => {
    const portal = createPortal(async () => {
      throw new Error("Not authenticated. Please login.");
    });

    const [result, error] = await fxClaudeCheckAuth(portal, {});

    expect(error).toBeNull();
    expect(result?.isAuthenticated).toBe(false);
    expect(result?.authType).toBe("none");
    expect(result?.reason).toContain("Not authenticated");
  });

  test("returns not installed when executable is missing", async () => {
    const portal = createPortal(async () => {
      throw new ReferenceError("Claude Code executable not found at /path/to/cli.js");
    });

    const [result, error] = await fxClaudeCheckInstalled(portal, {});

    expect(error).toBeNull();
    expect(result?.isInstalled).toBe(false);
    expect(result?.reason).toContain("executable not found");
  });

  test("returns typed error for unexpected failures", async () => {
    const portal = createPortal(async () => {
      throw new Error("Socket exploded unexpectedly");
    });

    const [result, error] = await fxClaudeCheck(portal, {});

    expect(result).toBeNull();
    expect(error?.code).toBe("FX.CLAUDE.CHECK.FAILED");
  });
});
