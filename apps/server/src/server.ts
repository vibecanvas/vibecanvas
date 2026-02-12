// Initialize global functions (tExternal, tInternal, executeRollbacks)
import './preload/patch-negative-timeout';
import { txConfigPath } from '@vibecanvas/core/vibecanvas-config/index';
import { setupAutomergeServer } from '@vibecanvas/shell';
import { ClaudeAgent } from '@vibecanvas/shell/claude-agent/srv.claude-agent';
import db from "@vibecanvas/shell/database/db";
import { existsSync, mkdirSync } from 'fs';
import { createServer } from 'net';
import { join, normalize } from 'path';
import { parseArgs } from 'util';
import { fileMetaFromPathname } from './files/file-storage';
import { baseOs } from './orpc.base';
import checkForUpgrade from './update';
import type { TInstallMethod } from './update/types';
import { getCliArgv, getServerVersion } from './runtime';


// Parse CLI arguments for port
const { positionals, values } = parseArgs({
  args: getCliArgv(),
  strict: false,
  allowPositionals: true,
  options: {
    version: {
      type: 'boolean',
      short: 'v',
      default: false,
    },
    check: {
      type: 'boolean',
      default: false,
    },
    method: {
      type: 'string',
    },
    'target-version': {
      type: 'string',
    },
  },
});
const commandOrPort = positionals[2];

if (values.version) {
  console.log(getServerVersion());
  process.exit(0);
}

if (commandOrPort === 'upgrade') {
  const methodValue = values.method as string | undefined;
  const methodOverride =
    methodValue === 'curl' || methodValue === 'npm' || methodValue === 'unknown'
      ? (methodValue as TInstallMethod)
      : undefined;

  if (methodValue && !methodOverride) {
    console.error('[Update] Invalid --method. Allowed: curl, npm, unknown');
    process.exit(1);
  }

  const result = await checkForUpgrade({
    force: true,
    checkOnly: Boolean(values.check),
    methodOverride,
    targetVersionOverride: values['target-version'] as string | undefined,
  });
  const currentVersion = getServerVersion();

  if (result.status === 'updated') {
    console.log(`[Update] Current: v${currentVersion}`);
    console.log(`[Update] Method: ${result.method}`);
    console.log(`[Update] Updated to v${result.version}`);
    process.exit(0);
  }

  if (result.status === 'up-to-date') {
    console.log(`[Update] Current: v${currentVersion}`);
    console.log(`[Update] Latest:  v${result.version}`);
    console.log(`[Update] Method: ${result.method}`);
    console.log(`[Update] Already up to date (v${result.version})`);
    process.exit(0);
  }

  if (result.status === 'update-available') {
    console.log(`[Update] Current: v${currentVersion}`);
    console.log(`[Update] Latest:  v${result.version}`);
    console.log(`[Update] Method: ${result.method}`);
    if (values.check) {
      console.log('[Update] Check-only mode, no changes applied');
    }
    console.log(`[Update] New version available: v${result.version}`);
    if (result.command) {
      console.log(`[Update] Run: ${result.command}`);
    }
    process.exit(0);
  }

  if (result.status === 'disabled') {
    console.log(`[Update] Auto-update disabled (${result.reason})`);
    process.exit(0);
  }

  console.error(`[Update] ${result.message}`);
  process.exit(1);
}

const parsedCliPort = commandOrPort ? parseInt(commandOrPort, 10) : undefined;
const cliPort = Number.isFinite(parsedCliPort) ? parsedCliPort : undefined;
const preferredPort = cliPort || 3000;
const isCompiledBinary = process.env.VIBECANVAS_COMPILED === 'true';
const publicDir = normalize(join(import.meta.dir, '..', 'public'));

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen({ port, exclusive: true });
  });
}

async function resolveServerPort(startPort: number): Promise<number> {
  if (!isCompiledBinary) {
    return startPort;
  }

  for (let port = startPort; port <= 65535; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`[Server] No available port found starting from ${startPort}`);
}

type EmbeddedAssetsModule = {
  getEmbeddedAsset(pathname: string): string | null;
  getSpaFallbackAsset(): string | null;
};

let getEmbeddedAsset = (_pathname: string): string | null => null;
let getSpaFallbackAsset = (): string | null => null;

try {
  // Keep this dynamic so dev servers can run without generated embedded-assets.ts.
  const embeddedAssetsModulePath = '../embedded-assets';
  const embeddedAssets = await import(embeddedAssetsModulePath) as EmbeddedAssetsModule;
  getEmbeddedAsset = embeddedAssets.getEmbeddedAsset;
  getSpaFallbackAsset = embeddedAssets.getSpaFallbackAsset;
} catch {
  // No-op in dev when embedded assets were not generated yet.
}

function getPublicAssetPath(pathname: string): string | null {
  const requestPath = pathname === '/' ? '/index.html' : pathname;
  const absolutePath = normalize(join(publicDir, requestPath));

  // Prevent path traversal outside public/.
  if (!absolutePath.startsWith(publicDir)) {
    return null;
  }

  return existsSync(absolutePath) ? absolutePath : null;
}

// Get database path from config
const [config, configError] = txConfigPath({ fs: { existsSync, mkdirSync } });
if (configError) {
  console.error('[Config Error]', configError);
  process.exit(1);
}

const claudeRuntime = ClaudeAgent.bootstrapRuntime();
if (claudeRuntime.available) {
  console.log(`[Claude] Runtime ready (${claudeRuntime.source}): ${claudeRuntime.detected.claudePath}`);
} else {
  console.warn(`[Claude] Runtime unavailable: ${claudeRuntime.reason}`);
}

// Initialize Automerge repo with SQLite storage and WebSocket adapter
const { wsAdapter } = setupAutomergeServer(config.databasePath);

// Stable wrapper per connection.
// We keep a separate wrapper object to avoid mutating websocket internals.
// wrapper object that satisfies the adapter's WebSocketWithIsAlive interface.
const automergeConnections = new Map<unknown, {
  data: { isAlive: boolean }
  readyState: number
  ping(): void
  close(): void
  send(data: ArrayBuffer): void
  terminate(): void
}>();

// Export API type for Eden client
export type App = any;

import { onError } from '@orpc/server';
import { RPCHandler } from '@orpc/server/bun-ws';
import { router } from './api-router';

const handler = new RPCHandler(baseOs.router(router), {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
})

type WebSocketData = {
  path: string;
};

const httpPort = await resolveServerPort(preferredPort);
if (httpPort !== preferredPort) {
  console.warn(`[Server] Port ${preferredPort} is busy, using ${httpPort}`);
}

Bun.serve({
  port: httpPort,
  fetch(req, server) {
    const url = new URL(req.url)

    const isWebSocketEndpoint = url.pathname === '/api' || url.pathname === '/automerge'
    if (isWebSocketEndpoint) {
      if (server.upgrade(req, { data: { path: url.pathname } })) {
        return
      }

      return new Response('Upgrade failed', { status: 500 })
    }

    if (req.method === 'GET' && url.pathname.startsWith('/files/')) {
      const fileMeta = fileMetaFromPathname(url.pathname)
      if (!fileMeta) {
        return new Response('Not Found', { status: 404 })
      }

      const record = db.query.files.findFirst({
        where: (table, { eq, and }) => and(
          eq(table.hash, fileMeta.hash),
          eq(table.format, fileMeta.format),
        )
      }).sync()
      if (!record) {
        return new Response('Not Found', { status: 404 })
      }

      const etag = `"${record.hash}"`
      const ifNoneMatch = req.headers.get('if-none-match')
      if (ifNoneMatch === etag) {
        return new Response(null, {
          status: 304,
          headers: {
            'ETag': etag,
            'Cache-Control': 'public, max-age=31536000, immutable',
          }
        })
      }

      const bytes = Buffer.from(record.base64, 'base64')
      return new Response(bytes, {
        headers: {
          'Content-Type': record.format,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'ETag': etag,
        }
      })
    }

    const embeddedAsset = getEmbeddedAsset(url.pathname)
    if (embeddedAsset) {
      return new Response(Bun.file(embeddedAsset))
    }

    const publicAsset = getPublicAssetPath(url.pathname)
    if (publicAsset) {
      return new Response(Bun.file(publicAsset))
    }

    const spaFallbackAsset = getSpaFallbackAsset()
    if (spaFallbackAsset) {
      return new Response(Bun.file(spaFallbackAsset))
    }

    const publicSpaFallback = getPublicAssetPath('/')
    if (publicSpaFallback) {
      return new Response(Bun.file(publicSpaFallback))
    }

    return new Response('Not Found', { status: 404 })
  },
  websocket: {
    data: {} as WebSocketData,
    open(ws) {
      if (ws.data.path === '/automerge') {
        // TODO: this is not needed
        const wrapper = {
          data: { isAlive: true },
          get readyState() { return ws.readyState; },
          ping() { ws.ping(); },
          close() { ws.close(); },
          send(data: ArrayBuffer) { ws.send(data); },
          terminate() { ws.terminate(); },
        };
        automergeConnections.set(ws, wrapper);
        wsAdapter.open(wrapper);
      }
    },
    message(ws, message) {
      if (ws.data.path === '/api') {
        handler.message(ws, message, {
          context: { db }, // Provide initial context if needed
        })
      } else if (ws.data.path === '/automerge') {
        const wrapper = automergeConnections.get(ws);
        if (!wrapper) return;
        wrapper.data.isAlive = true;

        // Handle potential binary-to-string coercion in websocket payloads
        let bufferMessage: Buffer;
        if (typeof message === 'string') {
          try {
            const textEncoder = new TextEncoder();
            bufferMessage = Buffer.from(textEncoder.encode(message));
          } catch (err) {
            console.error('[WS:automerge] Failed to convert string to Buffer:', err);
            return;
          }
        } else {
          bufferMessage = message as Buffer;
        }

        try {
          wsAdapter.message(wrapper, bufferMessage);
        } catch (err) {
          console.error('[WS:automerge] adapter.message() error:', err);
        }
      }
    },
    pong(ws, data) {
      if (ws.data.path !== '/automerge') return;
      const wrapper = automergeConnections.get(ws);
      if (!wrapper) return;

      const pongData = data
        ? Buffer.from(data.buffer, data.byteOffset, data.byteLength)
        : Buffer.alloc(0);
      wsAdapter.pong(wrapper, pongData);
    },
    close(ws, code, reason) {
      if (ws.data.path === '/automerge') {
        const wrapper = automergeConnections.get(ws);
        if (!wrapper) return;
        wsAdapter.close(wrapper, code ?? 1000, reason ?? '');
        automergeConnections.delete(ws);
      } else if (ws.data.path === '/api') {
        handler.close(ws)
      }
    },
  },
})

console.log(`Server listening on http://localhost:${httpPort}`);

setTimeout(() => {
  checkForUpgrade()
    .then((result) => {
      if (result.status === 'update-available') {
        console.log(`[Update] New version available: v${result.version}`);
        if (result.command) {
          console.log(`[Update] Run: ${result.command}`);
        }
      }

      if (result.status === 'updated') {
        console.log(`[Update] Updated to v${result.version}`);
      }
    })
    .catch(() => { });
}, 1000);
