import { ctrlDirFiles, ctrlDirHome, ctrlDirList } from "@vibecanvas/core/project-fs/index";
import { files as dbFiles } from "@vibecanvas/shell/database/schema";
import { createHash } from "crypto";
import { existsSync, readdirSync, statSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { extensionFromFormat, toPublicFileUrl } from "../files/file-storage";
import { baseOs } from "../orpc.base";

function getBase64Payload(base64OrDataUrl: string): string {
  const match = base64OrDataUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (match?.[1]) return match[1];
  return base64OrDataUrl;
}

const put = baseOs.api.file.put.handler(async ({ input, context: { db } }) => {
  const base64Payload = getBase64Payload(input.body.base64).trim();
  const bytes = Buffer.from(base64Payload, "base64");

  if (bytes.length === 0) {
    throw new Error("Invalid or empty image payload");
  }

  const hash = createHash("sha256").update(bytes).digest("hex");

  const existing = db.query.files.findFirst({ where: (table, { eq }) => eq(table.hash, hash) }).sync();
  const format = existing?.format ?? input.body.format;
  const fileName = `${hash}.${extensionFromFormat(format)}`;

  if (!existing) {
    db.insert(dbFiles).values({
      id: crypto.randomUUID(),
      hash,
      format: input.body.format,
      base64: base64Payload,
    }).run();
  }

  return {
    url: toPublicFileUrl(fileName),
  };
});


const dirPortal = {
  os: { homedir },
  fs: { readdirSync, existsSync, statSync },
  path: { dirname, join },
};

const home = baseOs.api.file.home.handler(async ({ }) => {
  const [result, error] = ctrlDirHome(dirPortal, {});
  if (error || !result) {
    return { type: error?.code ?? "ERROR", message: error?.externalMessage?.en ?? "Failed to get home directory" };
  }
  return result;
});

const list = baseOs.api.file.list.handler(async ({ input }) => {
  const [result, error] = ctrlDirList(dirPortal, { path: input.query.path });
  if (error || !result) {
    return { type: error?.code ?? "ERROR", message: error?.externalMessage?.en ?? "Failed to list directory" };
  }
  return result;
});

const files = baseOs.api.file.files.handler(async ({ input }) => {
  const home = homedir();
  const [result, error] = ctrlDirFiles(dirPortal, {
    path: input.query.path ?? home,
    glob_pattern: input.query.glob_pattern,
    max_depth: input.query.max_depth,
  });
  if (error || !result) {
    return { type: error?.code ?? "ERROR", message: error?.externalMessage?.en ?? "Failed to list files" };
  }
  return result;
});

export const file = {
  home,
  put,
  list,
  files,
};
