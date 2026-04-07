import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';
import type { PeerId } from '@automerge/automerge-repo';
import { BunWSServerAdapter, type WebSocketWithIsAlive } from '../src/adapters/websocket.adapter';
// @ts-ignore - internal module
import { decode, encode } from '@automerge/automerge-repo/helpers/cbor.js';

type TMockSocket = WebSocketWithIsAlive & {
  sent: ArrayBuffer[];
  pingCount: number;
  closeCount: number;
  terminateCount: number;
};

function createSocket(): TMockSocket {
  return {
    data: { isAlive: false },
    readyState: WebSocket.OPEN,
    sent: [],
    pingCount: 0,
    closeCount: 0,
    terminateCount: 0,
    ping() {
      this.pingCount += 1;
    },
    close() {
      this.closeCount += 1;
      this.readyState = WebSocket.CLOSED;
    },
    send(data: ArrayBuffer) {
      this.sent.push(data);
    },
    terminate() {
      this.terminateCount += 1;
      this.readyState = WebSocket.CLOSED;
    },
  };
}

function encodeClientMessage(message: Record<string, unknown>): Uint8Array {
  return encode(message as never);
}

const previousSilentAutomergeLogs = process.env.VIBECANVAS_SILENT_AUTOMERGE_LOGS;

beforeAll(() => {
  process.env.VIBECANVAS_SILENT_AUTOMERGE_LOGS = '1';
});

afterAll(() => {
  if (previousSilentAutomergeLogs === undefined) {
    delete process.env.VIBECANVAS_SILENT_AUTOMERGE_LOGS;
    return;
  }
  process.env.VIBECANVAS_SILENT_AUTOMERGE_LOGS = previousSilentAutomergeLogs;
});

describe('BunWSServerAdapter', () => {
  const adapters: BunWSServerAdapter[] = [];

  afterEach(() => {
    while (adapters.length > 0) {
      adapters.pop()?.disconnect();
    }
  });

  test('becomes ready after connect', async () => {
    const adapter = new BunWSServerAdapter();
    adapters.push(adapter);

    expect(adapter.isReady()).toBe(false);
    adapter.connect('server-1' as PeerId);
    await adapter.whenReady();
    expect(adapter.isReady()).toBe(true);
  });

  test('accepts join and sends peer response to socket', () => {
    const adapter = new BunWSServerAdapter();
    adapters.push(adapter);
    adapter.connect('server-1' as PeerId, { role: 'server' });

    const socket = createSocket();
    const peerCandidates: Array<{ peerId: PeerId; peerMetadata: Record<string, unknown> }> = [];
    adapter.on('peer-candidate', (event) => {
      peerCandidates.push(event as { peerId: PeerId; peerMetadata: Record<string, unknown> });
    });

    adapter.receiveMessage(encodeClientMessage({
      type: 'join',
      senderId: 'client-1',
      peerMetadata: { role: 'client' },
      supportedProtocolVersions: ['1'],
    }), socket);

    expect(peerCandidates).toEqual([
      { peerId: 'client-1', peerMetadata: { role: 'client' } },
    ]);
    expect(socket.sent).toHaveLength(1);

    const response = decode(new Uint8Array(socket.sent[0]!)) as Record<string, unknown>;
    expect(response.type).toBe('peer');
    expect(response.senderId).toBe('server-1');
    expect(response.targetId).toBe('client-1');
    expect(response.selectedProtocolVersion).toBe('1');
  });

  test('terminates joined socket on leave message', () => {
    const adapter = new BunWSServerAdapter();
    adapters.push(adapter);
    adapter.connect('server-1' as PeerId);

    const socket = createSocket();
    const disconnected: string[] = [];
    adapter.on('peer-disconnected', (event) => {
      disconnected.push((event as { peerId: string }).peerId);
    });

    adapter.receiveMessage(encodeClientMessage({
      type: 'join',
      senderId: 'client-1',
      supportedProtocolVersions: ['1'],
    }), socket);
    adapter.receiveMessage(encodeClientMessage({
      type: 'leave',
      senderId: 'client-1',
    }), socket);

    expect(socket.terminateCount).toBe(1);
    expect(disconnected).toContain('client-1');
  });
});
