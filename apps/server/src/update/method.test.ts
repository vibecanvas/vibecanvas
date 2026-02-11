import { afterEach, describe, expect, test } from "bun:test";
import detectInstallMethod from "./method";

const originalExecPath = process.execPath;

function setExecPath(value: string) {
  Object.defineProperty(process, "execPath", {
    value,
    configurable: true,
  });
}

afterEach(() => {
  setExecPath(originalExecPath);
});

describe("update/method", () => {
  test("detects curl install from ~/.vibecanvas/bin path", () => {
    setExecPath("/Users/test/.vibecanvas/bin/vibecanvas");
    expect(detectInstallMethod()).toBe("curl");
  });

  test("detects npm install from node_modules path", () => {
    setExecPath("/usr/local/lib/node_modules/vibecanvas/bin/vibecanvas");
    expect(detectInstallMethod()).toBe("npm");
  });

  test("falls back to unknown", () => {
    setExecPath("/tmp/random-binary");
    expect(detectInstallMethod()).toBe("unknown");
  });
});
