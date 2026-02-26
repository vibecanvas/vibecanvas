import { createORPCClient, createSafeClient, type SafeClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { inferRPCMethodFromContractRouter } from "@orpc/contract";
import { apiContract } from "@vibecanvas/core-contract";

type TCanvasClient = ContractRouterClient<typeof apiContract>;
type TSafeCanvasClient = SafeClient<TCanvasClient>;

function getRpcBaseUrl(): string {
  return `${window.location.protocol}//${window.location.host}`;
}

class OrpcWebsocketService {
  readonly client: TCanvasClient;
  readonly safeClient: TSafeCanvasClient;

  constructor() {
    const link = new RPCLink({
      url: getRpcBaseUrl(),
      method: inferRPCMethodFromContractRouter(apiContract),
    });

    this.client = createORPCClient(link);
    this.safeClient = createSafeClient(this.client);
  }
}

export const orpcWebsocketService = new OrpcWebsocketService();
