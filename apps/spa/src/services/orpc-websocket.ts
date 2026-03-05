import { createORPCClient, createSafeClient, type SafeClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import type { ContractRouterClient } from "@orpc/contract";
import { apiContract } from "@vibecanvas/core-contract";
import { WebSocket as PartySocketWebSocket } from "partysocket";

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
  }
}

export const orpcWebsocketService = new OrpcWebsocketService();
