import { files as dbFiles } from "@vibecanvas/shell/database/schema";
import { fileMetaFromPathname } from "@vibecanvas/core/file/fn.file-storage";
import { createHash } from "crypto";
import { extensionFromFormat, toPublicFileUrl } from "@vibecanvas/core/file/fn.file-storage";
import { baseOs } from "../orpc.base";
import { eq } from "drizzle-orm";

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
  const id = crypto.randomUUID();
  const fileName = `${id}.${extensionFromFormat(input.body.format)}`;

  db.insert(dbFiles).values({
    id,
    hash,
    format: input.body.format,
    base64: base64Payload,
  }).run();

  return {
    url: toPublicFileUrl(fileName),
  };
});

const clone = baseOs.api.file.clone.handler(async ({ input, context: { db } }) => {
  const fileMeta = fileMetaFromPathname(new URL(input.body.url, "http://localhost").pathname);
  if (!fileMeta) {
    throw new Error("Invalid file url");
  }

  const record = db.query.files.findFirst({
    where: (table, { and, eq }) => and(
      eq(table.id, fileMeta.id),
      eq(table.format, fileMeta.format),
    ),
  }).sync();

  if (!record) {
    throw new Error("File not found");
  }

  const clonedId = crypto.randomUUID();
  db.insert(dbFiles).values({
    id: clonedId,
    hash: record.hash,
    format: record.format,
    base64: record.base64,
  }).run();

  return { url: toPublicFileUrl(`${clonedId}.${extensionFromFormat(record.format)}`) };
});

const remove = baseOs.api.file.remove.handler(async ({ input, context: { db } }) => {
  const fileMeta = fileMetaFromPathname(new URL(input.body.url, "http://localhost").pathname);
  if (!fileMeta) {
    throw new Error("Invalid file url");
  }

  const record = db.query.files.findFirst({
    where: (table, { and, eq }) => and(
      eq(table.id, fileMeta.id),
      eq(table.format, fileMeta.format),
    ),
  }).sync();

  if (!record) {
    return { ok: true };
  }

  db.delete(dbFiles).where(eq(dbFiles.id, record.id)).run();

  return { ok: true };
});

export const file = {
  put,
  clone,
  remove,
};
