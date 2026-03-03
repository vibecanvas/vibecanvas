import type { Transport } from "@codemirror/lsp-client";
import { lspManagerService } from "@/services/lsp-manager";

export class LspChannelTransport implements Transport {
  private readonly handlers = new Set<(value: string) => void>();
  private disposeMessageSubscription: (() => void) | null = null;

  constructor(private readonly channelId: string) {}

  send(message: string): void {
    console.log("[LSP:Transport] send", {
      channelId: this.channelId,
      bytes: message.length,
      preview: message.slice(0, 120),
    });
    void lspManagerService.send(this.channelId, message);
  }

  subscribe(handler: (value: string) => void): void {
    console.log("[LSP:Transport] subscribe", { channelId: this.channelId });
    this.handlers.add(handler);
    if (this.disposeMessageSubscription) return;

    this.disposeMessageSubscription = lspManagerService.onChannelMessage(this.channelId, (message) => {
      console.log("[LSP:Transport] recv", {
        channelId: this.channelId,
        bytes: message.length,
        preview: message.slice(0, 120),
      });
      for (const listener of this.handlers) {
        listener(message);
      }
    });
  }

  unsubscribe(handler: (value: string) => void): void {
    console.log("[LSP:Transport] unsubscribe", { channelId: this.channelId });
    this.handlers.delete(handler);
    if (this.handlers.size > 0) return;

    if (this.disposeMessageSubscription) {
      this.disposeMessageSubscription();
      this.disposeMessageSubscription = null;
    }
  }

  dispose(): void {
    console.log("[LSP:Transport] dispose", { channelId: this.channelId });
    this.handlers.clear();
    if (this.disposeMessageSubscription) {
      this.disposeMessageSubscription();
      this.disposeMessageSubscription = null;
    }
  }
}
