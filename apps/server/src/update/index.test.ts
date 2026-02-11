import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import checkForUpgrade from "./index";

const originalConfigEnv = process.env.VIBECANVAS_CONFIG;
const originalDisableEnv = process.env.VIBECANVAS_DISABLE_AUTOUPDATE;
const originalVersionEnv = process.env.VIBECANVAS_VERSION;

let tempDirs: string[] = [];

function setupTempConfigDir() {
  const dir = mkdtempSync(join(tmpdir(), "vibecanvas-update-index-test-"));
  tempDirs.push(dir);
  process.env.VIBECANVAS_CONFIG = dir;
}

afterEach(() => {
  process.env.VIBECANVAS_CONFIG = originalConfigEnv;
  process.env.VIBECANVAS_DISABLE_AUTOUPDATE = originalDisableEnv;
  process.env.VIBECANVAS_VERSION = originalVersionEnv;
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
});

describe("update/index", () => {
  test("returns disabled when env override is set", async () => {
    setupTempConfigDir();
    process.env.VIBECANVAS_DISABLE_AUTOUPDATE = "1";

    const result = await checkForUpgrade({ force: true, methodOverride: "curl" });
    expect(result.status).toBe("disabled");
  });

  test("check-only mode returns update-available without mutation", async () => {
    setupTempConfigDir();
    process.env.VIBECANVAS_VERSION = "0.0.1";
    delete process.env.VIBECANVAS_DISABLE_AUTOUPDATE;

    const result = await checkForUpgrade({
      force: true,
      checkOnly: true,
      methodOverride: "npm",
      targetVersionOverride: "0.0.2",
    });

    expect(result.status).toBe("update-available");
    if (result.status === "update-available") {
      expect(result.method).toBe("npm");
      expect(result.version).toBe("0.0.2");
      expect(result.command).toBe("npm install -g vibecanvas@0.0.2");
    }
  });
});
