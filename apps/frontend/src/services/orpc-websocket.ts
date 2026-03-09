import { createORPCClient, createSafeClient, type SafeClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import type { ContractRouterClient } from "@orpc/contract";
import { apiContract } from "@vibecanvas/core-contract";
import { WebSocket as PartySocketWebSocket } from "partysocket";
import { showErrorToast, showSuccessToast, showToast } from "../components/ui/Toast";

type TCanvasClient = ContractRouterClient<typeof apiContract>;
type TSafeCanvasClient = SafeClient<TCanvasClient>;

function getRpcWebsocketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api`;
}

class OrpcWebsocketService {
  readonly client: TCanvasClient;
  readonly safeClient: TSafeCanvasClient;
  readonly websocket: PartySocketWebSocket;

  constructor() {
    this.websocket = new PartySocketWebSocket(getRpcWebsocketUrl());

    const link = new RPCLink({
      websocket: this.websocket,
    });

    this.client = createORPCClient(link);
    this.safeClient = createSafeClient(this.client);

    this.setupNotifications();
  }

  private setupNotifications() {
    orpcWebsocketService.safeClient.api.notification.events({})
      .then(async ([err, it]) => {
        if (err) return;
        for await (const event of it) {
          if (event.type === "error") showErrorToast(event.title, event.description);
          else if (event.type === "success") showSuccessToast(event.title, event.description);
          else showToast(event.title, event.description);
        }
      });
  }
}

export const orpcWebsocketService = new OrpcWebsocketService();
