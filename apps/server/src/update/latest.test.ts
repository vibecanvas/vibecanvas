import { afterEach, describe, expect, test } from "bun:test";
import fetchLatestVersion from "./latest";

const originalFetch = globalThis.fetch;
const originalChannel = process.env.VIBECANVAS_CHANNEL;

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.VIBECANVAS_CHANNEL = originalChannel;
});

describe("update/latest", () => {
  test("fetches stable latest version", async () => {
    process.env.VIBECANVAS_CHANNEL = "stable";
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ tag_name: "v1.2.3" }), { status: 200 })) as typeof fetch;

    const latest = await fetchLatestVersion();
    expect(latest).toEqual({ version: "1.2.3", channel: "stable" });
  });
});
