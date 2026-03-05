import { describe, test, expect } from "bun:test";
import { extname, join } from "path";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { ctrlFileRead } from "./ctrl.file-read";

const portal = {
  fs: {
    readFileSync,
    statSync,
  },
  path: {
    extname,
  },
};

function withTempDir(run: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), "vibecanvas-file-read-"));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("ctrlFileRead", () => {
  test("returns base64 payload for pdf", () => {
    withTempDir((root) => {
      const filePath = join(root, "doc.pdf");
      const payload = "%PDF-1.7\nTest";
      writeFileSync(filePath, payload, "utf8");

      const [result, error] = ctrlFileRead(portal, {
        path: filePath,
        content: "base64",
      });

      expect(error).toBeNull();
      expect(result?.kind).toBe("binary");
      if (!result || result.kind !== "binary") return;

      expect(result.mime).toBe("application/pdf");
      expect(result.encoding).toBe("base64");
      expect(result.content).not.toBeNull();
      expect(result.content && Buffer.from(result.content, "base64").toString("utf8")).toBe(payload);
    });
  });

  test("returns null content when pdf exceeds base64 size guard", () => {
    withTempDir((root) => {
      const filePath = join(root, "large.pdf");
      writeFileSync(filePath, Buffer.alloc(10 * 1024 * 1024 + 1));

      const [result, error] = ctrlFileRead(portal, {
        path: filePath,
        content: "base64",
      });

      expect(error).toBeNull();
      expect(result?.kind).toBe("binary");
      if (!result || result.kind !== "binary") return;

      expect(result.mime).toBe("application/pdf");
      expect(result.encoding).toBe("base64");
      expect(result.content).toBeNull();
    });
  });
});
