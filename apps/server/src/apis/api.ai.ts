import type { SDKMessage, SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import { EventPublisher, ORPCError } from "@orpc/server";
import ctrlAiInit from "@vibecanvas/core/ai/ctrl.ai.init";
import ctrlAiPrompt from "@vibecanvas/core/ai/ctrl.ai.prompt";
import { tExternal } from "@vibecanvas/server/error-fn";
import { ClaudeAgent } from "@vibecanvas/shell/claude-agent/srv.claude-agent";
import { homedir } from "os";
import { baseOs } from "../orpc.base";
import { dbUpdatePublisher } from "./api.db";

const chatEventPublisher = new EventPublisher<Record<string, SDKMessage>>()

const init = baseOs.api.ai.init.handler(async ({ input, context: { db } }) => {

  const [connectResult, connectError] = ctrlAiInit({ db, ClaudeAgent: ClaudeAgent }, {
    canvasId: input.canvasId,
    chatId: input.chatId,
    harness: input.harness
  })

  if (connectError) {
    throw new Error(tExternal(connectError))
  }

  return connectResult.chat
});

const prompt = baseOs.api.ai.prompt.handler(async ({ input, context: { db } }) => {
  const home = homedir();


  const chat = db.query.chats.findFirst({ where: (table, { eq }) => eq(table.id, input.chatId) }).sync()
  if(!chat) throw new ORPCError('CHAT_NOT_FOUND', { message: 'Chat not found', })

  let resultMessage: SDKResultMessage | undefined = undefined;
  for await (const [message, error] of ctrlAiPrompt({ClaudeAgent, db }, { chatId: input.chatId, path: chat.local_path ?? home, data: input.data })) {
    if(error) throw new Error(tExternal(error))
    if(message.type !== 'db-update') chatEventPublisher.publish(input.chatId, message)
    if (message.type === 'db-update') dbUpdatePublisher.publish(chat.canvas_id, { data: message.data })
    if (message.type === 'result') {
      resultMessage = message;
    }
  }

  if (!resultMessage) {
    throw new ORPCError('NO_RESULT_MESSAGE', {
        message: 'No result message received',
        data: { }
      })
  }

  return resultMessage;
})

const events = baseOs.api.ai.events.handler(async function* ({ input, context: { db } }) {
  for await (const event of chatEventPublisher.subscribe(input.chatId)) {
    yield event;
  }
})

export const ai = {
  init,
  prompt,
  events
}
