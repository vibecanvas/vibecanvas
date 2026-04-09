import { createORPCClient, createSafeClient, type SafeClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import { oc, populateContractRouterPaths, type ContractRouterClient } from "@orpc/contract";
import { canvasContract } from '@vibecanvas/api-canvas/contract';
import { dbContract } from '@vibecanvas/api-db/contract';
import { fileContract } from '@vibecanvas/api-file/contract';
import { filesystemContract } from '@vibecanvas/api-filesystem/contract';
import { notificationContract } from '@vibecanvas/api-notification/contract';
import { ptyContract } from '@vibecanvas/api-pty/contract';
import { WebSocket as PartySocketWebSocket } from "partysocket";
import { showErrorToast, showSuccessToast, showToast } from "../components/ui/Toast";

const contract = oc.router({
  canvas: canvasContract,
  db: dbContract,
  file: fileContract,
  filesystem: filesystemContract,
  notification: notificationContract,
  pty: ptyContract,
});

const apiContract = populateContractRouterPaths(
  oc.router({ api: contract }),
);

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
    this.safeClient.api.notification.events({})
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
