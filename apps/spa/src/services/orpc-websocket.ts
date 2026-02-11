import { createORPCClient, createSafeClient, type SafeClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import type { ContractRouterClient } from "@orpc/contract";
import { contract } from "@vibecanvas/core-contract";
import { WebSocket as PartySocketWebSocket } from "partysocket";
const apiContract = { api: contract }
type TCanvasClient = ContractRouterClient<typeof apiContract>;
type TSafeCanvasClient = SafeClient<TCanvasClient>;

function getRpcUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api`;
}

class OrpcWebsocketService {
  readonly websocket: PartySocketWebSocket;
  readonly client: TCanvasClient;
  readonly safeClient: TSafeCanvasClient;

  constructor() {
    this.websocket = new PartySocketWebSocket(getRpcUrl(), [], {
      connectionTimeout: 4000,
      minReconnectionDelay: 1000,
      maxReconnectionDelay: 10000,
      maxRetries: Infinity,
      reconnectionDelayGrowFactor: 1.5,
    });

    this.websocket.onopen = () => {
      const link = new RPCLink({ websocket: this.websocket });
      // @ts-ignore
      this.client = createORPCClient(link);
      // @ts-ignore
      this.safeClient = createSafeClient(this.client);
    };

    const link = new RPCLink({ websocket: this.websocket });
    this.client = createORPCClient(link);
    this.safeClient = createSafeClient(this.client);
  }
}

export const orpcWebsocketService = new OrpcWebsocketService();
