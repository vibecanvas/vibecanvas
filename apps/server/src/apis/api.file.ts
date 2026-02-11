import { createHash } from "crypto";
import { files } from "@vibecanvas/shell/database/schema";
import { baseOs } from "../orpc.base";
import { extensionFromFormat, toPublicFileUrl } from "../files/file-storage";

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
    db.insert(files).values({
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

export const file = {
  put,
};
