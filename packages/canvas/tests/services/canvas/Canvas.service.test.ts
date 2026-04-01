import { describe, expect, test, vi } from "vitest";
import { HelpPlugin } from "../../../src/plugins/Help.plugin";
import { RecorderPlugin } from "../../../src/plugins/Recorder.plugin";
import { defaultPlugins } from "../../../src/services/canvas/Canvas.service";

describe("defaultPlugins", () => {
  test("includes recorder plugin in development", () => {
    const plugins = defaultPlugins(
      { onToggleSidebar: vi.fn() },
      { DEV: true },
    );

    expect(plugins.some((plugin) => plugin instanceof RecorderPlugin)).toBe(true);
    expect(plugins.findIndex((plugin) => plugin instanceof HelpPlugin)).toBeLessThan(
      plugins.findIndex((plugin) => plugin instanceof RecorderPlugin),
    );
  });

  test("omits recorder plugin in production", () => {
    const plugins = defaultPlugins(
      { onToggleSidebar: vi.fn() },
      { DEV: false },
    );

    expect(plugins.some((plugin) => plugin instanceof RecorderPlugin)).toBe(false);
  });
});
