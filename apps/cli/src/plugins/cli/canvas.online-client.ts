import { createORPCClient, createSafeClient, type SafeClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ContractRouterClient } from '@orpc/contract';
import { canvasCmdApiContract } from '@vibecanvas/api-canvas-cmd/contract';

type TCanvasCmdClient = ContractRouterClient<typeof canvasCmdApiContract>;
type TSafeCanvasCmdClient = SafeClient<TCanvasCmdClient>;

function resolveCanvasCmdRpcUrl(port: number): string {
  return `http://127.0.0.1:${port}/rpc`;
}

function createCanvasSafeClient(port: number): TSafeCanvasCmdClient {
  const link = new RPCLink({ url: resolveCanvasCmdRpcUrl(port) });
  const client = createORPCClient<typeof canvasCmdApiContract>(link);
  return createSafeClient(client) as TSafeCanvasCmdClient;
}

export { createCanvasSafeClient, resolveCanvasCmdRpcUrl };
