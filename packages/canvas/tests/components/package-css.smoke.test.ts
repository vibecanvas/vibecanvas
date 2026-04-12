import { expect, test } from "vitest";

test("canvas package entry imports without app-side tailwind wiring", async () => {
  const entry = await import("../../src/index");

  expect(entry.Canvas).toBeTypeOf("function");
});
