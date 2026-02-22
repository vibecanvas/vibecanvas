import { EventPublisher, ORPCError } from "@orpc/server";
import { tExternal } from "@vibecanvas/server/error-fn";
import { homedir } from "os";
import { baseOs } from "../orpc.base";
import { dbUpdatePublisher } from "./api.db";
import type { Event as OpenCodeEvent, NotFoundError, UserMessage } from "@opencode-ai/sdk/v2";
import { agent_logs } from "@vibecanvas/shell/database/schema"

// Base64 Images
// Send images and other binary files using data URLs in the url field of file parts.
// ---
// Format
// Pattern: data:<mime-type>;base64,<base64-data>
// For images:
// - PNG: data:image/png;base64,<base64-string>
// - JPEG: data:image/jpeg;base64,<base64-string>
// - WebP: data:image/webp;base64,<base64-string>
// ---
// Example
// With a base64 string:
// const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
// await client.session.prompt({
//   sessionID: chat.session_id,
//   parts: [
//     {
//       type: 'file',
//       mime: 'image/png',
//       url: `data:image/png;base64,${base64}`,
//       filename: 'screenshot.png'
//     },
//     {
//       type: 'text',
//       text: 'What do you see in this image?'
//     }
//   ]
// })
// From a file:
// import { readFile } from 'fs/promises'
// const buffer = await readFile('./image.png')
// const base64 = buffer.toString('base64')
// await client.session.prompt({
//   sessionID: chat.session_id,
//   parts: [
//     {
//       type: 'file',
//       mime: 'image/png',
//       url: `data:image/png;base64,${base64}`
//     }
//   ]
// })
// ---
// Notes
// - The mime type should match the data URL
// - filename is optional but helps with context
// - Works for any binary format supported by the LLM
// - Avoid sending very large images (check model limits)

const prompt = baseOs.api.ai.prompt.handler(async ({ input, context: { db, opencodeService } }) => {
  const chat = db.query.chats.findFirst({ where: (table, { eq }) => eq(table.id, input.chatId) }).sync()
  if (!chat) throw new ORPCError('CHAT_NOT_FOUND', { message: 'Chat not found', })

  const client = opencodeService.getClient(chat.id)

  const { data, error } = await client.session.prompt({
    sessionID: chat.session_id,
    parts: input.parts,
  })

  if (error) {
    if ("name" in error && error.name === "NotFoundError") {
      throw new ORPCError('SESSION_NOT_FOUND', {
        message: error.data.message,
      })
    }
    console.error('opencode prompt bad request ' + JSON.stringify(error, null, 2))
    // BadRequestError (no `name` field)
    throw new ORPCError('BAD_REQUEST', {
      message: 'Bad request',
    })
  }

  console.log(JSON.stringify(data, null, 2))

  const userMessageID = data.info.parentID
  // Fetch complete message with parts
  const { data: userMessage, error: userMessageError } = await client.session.message({
    sessionID: chat.session_id,
    messageID: userMessageID,
  })

  if (userMessageError) {
    console.error('opencode message bad request ' + JSON.stringify(userMessageError, null, 2))
    throw new ORPCError('BAD_REQUEST', {
      message: 'Bad request',
    })
  }

  db.insert(agent_logs).values({
    id: data.info.parentID,
    canvas_id: chat.canvas_id,
    session_id: data.info.sessionID,
    timestamp: new Date(),
    data: userMessage,
  }).run()

  db.insert(agent_logs).values({
    id: data.info.id,
    canvas_id: chat.canvas_id,
    session_id: data.info.sessionID,
    timestamp: new Date(),
    data,
  }).run()


  return data;
})

const events = baseOs.api.ai.events.handler(async function* ({ input, context: { db, opencodeService } }) {
  const chat = db.query.chats.findFirst({ where: (table, { eq }) => eq(table.id, input.chatId) }).sync()
  if (!chat) throw new ORPCError('CHAT_NOT_FOUND', { message: 'Chat not found', })

  const client = opencodeService.getClient(chat.id)
  for await (const event of (await client.event.subscribe()).stream) {
    yield event;
  }
})

export const ai = {
  prompt,
  events
}
