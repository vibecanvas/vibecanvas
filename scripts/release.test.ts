import { describe, expect, test } from "bun:test"
import { stripAuthorAttribution } from "./release"

describe("stripAuthorAttribution", () => {
  test("strips 'by @user' from changelog entries", () => {
    const input = "* Add filetree canvas element by @omarezzat in https://github.com/org/repo/pull/8\n"
    const result = stripAuthorAttribution(input)
    expect(result).toBe("* Add filetree canvas element in https://github.com/org/repo/pull/8\n")
  })

  test("preserves PR links", () => {
    const input = "* Fix bug by @dev in https://github.com/org/repo/pull/42\n"
    const result = stripAuthorAttribution(input)
    expect(result).toContain("https://github.com/org/repo/pull/42")
  })

  test("preserves 'New Contributors' section untouched", () => {
    const input = [
      "## What's Changed",
      "* Add feature by @alice in https://github.com/org/repo/pull/1",
      "",
      "## New Contributors",
      "* @alice made their first contribution in https://github.com/org/repo/pull/1",
      "",
    ].join("\n")

    const result = stripAuthorAttribution(input)
    expect(result).toContain("* @alice made their first contribution in https://github.com/org/repo/pull/1")
    expect(result).not.toContain("* Add feature by @alice")
    expect(result).toContain("* Add feature in https://github.com/org/repo/pull/1")
  })

  test("handles notes with no 'New Contributors' section", () => {
    const input = [
      "## What's Changed",
      "* Refactor module by @bob in https://github.com/org/repo/pull/5",
      "* Fix typo by @charlie in https://github.com/org/repo/pull/6",
      "",
    ].join("\n")

    const result = stripAuthorAttribution(input)
    expect(result).toBe(
      [
        "## What's Changed",
        "* Refactor module in https://github.com/org/repo/pull/5",
        "* Fix typo in https://github.com/org/repo/pull/6",
        "",
      ].join("\n"),
    )
  })

  test("handles notes with no author attribution (no-op)", () => {
    const input = [
      "## What's Changed",
      "* Add docs in https://github.com/org/repo/pull/10",
      "",
    ].join("\n")

    const result = stripAuthorAttribution(input)
    expect(result).toBe(input)
  })

  test("handles hyphenated usernames", () => {
    const input = "* Update CI by @some-dev-user in https://github.com/org/repo/pull/99\n"
    const result = stripAuthorAttribution(input)
    expect(result).toBe("* Update CI in https://github.com/org/repo/pull/99\n")
  })
})
