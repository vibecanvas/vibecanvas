import { type OpencodeClient, createOpencodeClient, createOpencodeServer, type Event as OpenCodeEvent } from "@opencode-ai/sdk/v2";

/**
 * Use as singleton
 */
export class OpencodeService {
  private opencodeClients: { [chatId: string]: OpencodeClient } = {}

  private constructor(private opencodeServer: { url: string; close(): void; }) {
    process.on('exit', () => {
      this.opencodeServer.close()
    })
  }

  static async init(): Promise<OpencodeService> {
    const opencodeServer = await createOpencodeServer({
      config: {
        autoupdate: false,
      }
    })
    return new OpencodeService(opencodeServer);
  }

  getClient(chatId: string) {
    if (this.opencodeClients[chatId]) return this.opencodeClients[chatId];

    this.opencodeClients[chatId] = createOpencodeClient({
      baseUrl: this.opencodeServer.url,
    })
    this.opencodeClients[chatId].event.subscribe({}).then(async (a) => {
      for await (const event of a.stream) {
        console.log(event)
      }
    })
    return this.opencodeClients[chatId];
  }

  closeClient(chatId: string) {
    if (this.opencodeClients[chatId]) {
      delete this.opencodeClients[chatId];
    }
  }
}