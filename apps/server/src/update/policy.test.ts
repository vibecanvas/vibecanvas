import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import resolveUpdatePolicy from "./policy";

const originalConfigEnv = process.env.VIBECANVAS_CONFIG;
const originalDisableEnv = process.env.VIBECANVAS_DISABLE_AUTOUPDATE;

let tempDirs: string[] = [];

function withConfig(config: object) {
  const dir = mkdtempSync(join(tmpdir(), "vibecanvas-policy-test-"));
  tempDirs.push(dir);
  writeFileSync(join(dir, "config.json"), JSON.stringify(config, null, 2));
  process.env.VIBECANVAS_CONFIG = dir;
}

afterEach(() => {
  process.env.VIBECANVAS_CONFIG = originalConfigEnv;
  process.env.VIBECANVAS_DISABLE_AUTOUPDATE = originalDisableEnv;
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
});

describe("update/policy", () => {
  test("env disable wins over config", () => {
    withConfig({ autoupdate: true });
    process.env.VIBECANVAS_DISABLE_AUTOUPDATE = "1";

    const policy = resolveUpdatePolicy("curl");
    expect(policy.mode).toBe("disabled");
    expect(policy.reason).toBe("env");
  });

  test("notify config returns notify mode", () => {
    withConfig({ autoupdate: "notify" });
    delete process.env.VIBECANVAS_DISABLE_AUTOUPDATE;

    const policy = resolveUpdatePolicy("curl");
    expect(policy.mode).toBe("notify");
    expect(policy.reason).toBe("config");
  });

  test("non-curl method defaults to notify", () => {
    withConfig({ autoupdate: true });
    delete process.env.VIBECANVAS_DISABLE_AUTOUPDATE;

    const policy = resolveUpdatePolicy("npm");
    expect(policy.mode).toBe("notify");
    expect(policy.reason).toBe("method");
  });
});
