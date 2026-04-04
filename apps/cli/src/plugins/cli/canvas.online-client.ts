import { createORPCClient, createSafeClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/websocket';
import { apiContract } from '@vibecanvas/core-contract';

function resolveRpcWebsocketUrl(port: number): string {
  return `ws://127.0.0.1:${port}/api`;
}

function createCanvasSafeClient(port: number) {
  const websocket = new WebSocket(resolveRpcWebsocketUrl(port));
  const link = new RPCLink({ websocket });
  const client = createORPCClient<typeof apiContract>(link);
  return createSafeClient(client);
}

export { createCanvasSafeClient, resolveRpcWebsocketUrl };
