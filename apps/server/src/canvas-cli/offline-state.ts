import { Repo, type PeerId } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { BunSqliteStorageAdapter } from "@vibecanvas/shell/automerge/index";
import { txConfigPath } from "@vibecanvas/core/vibecanvas-config/tx.config-path";
import { existsSync, mkdirSync } from "node:fs";

let offlineRepoCache: { databasePath: string; repo: Repo } | null = null;
let liveRepoCache: { wsUrl: string; repo: Repo } | null = null;

function getOfflineRepo(databasePath: string): Repo {
  if (offlineRepoCache?.databasePath === databasePath) return offlineRepoCache.repo;
  const repo = new Repo({ storage: new BunSqliteStorageAdapter(databasePath), peerId: `canvas-cli-${crypto.randomUUID()}` as PeerId });
  offlineRepoCache = { databasePath, repo };
  return repo;
}

function resolveLiveAutomergeUrl(): string {
  const explicitUrl = process.env.VIBECANVAS_AUTOMERGE_URL;
  if (explicitUrl) return explicitUrl;
  const port = process.env.VIBECANVAS_PORT ?? process.env.PORT ?? (typeof VIBECANVAS_COMPILED !== "undefined" && VIBECANVAS_COMPILED ? "7496" : "3000");
  return `ws://127.0.0.1:${port}/automerge`;
}

function createLiveRepo(wsUrl = resolveLiveAutomergeUrl()): Repo {
  return new Repo({ network: [new BrowserWebSocketClientAdapter(wsUrl)], peerId: `canvas-cli-live-${crypto.randomUUID()}` as PeerId });
}

function getLiveRepo(): Repo {
  const wsUrl = resolveLiveAutomergeUrl();
  if (liveRepoCache?.wsUrl === wsUrl) return liveRepoCache.repo;
  const repo = createLiveRepo(wsUrl);
  liveRepoCache = { wsUrl, repo };
  return repo;
}

async function openOfflineCanvasState() {
  const [config, configError] = txConfigPath({ fs: { existsSync, mkdirSync } }, {
    isCompiled: typeof VIBECANVAS_COMPILED !== "undefined" ? VIBECANVAS_COMPILED : false,
  });

  if (configError || !config) {
    throw new Error(configError?.internalMessage ?? "Failed to resolve canvas database path.");
  }

  const [{ default: db }] = await Promise.all([
    import("@vibecanvas/shell/database/db"),
  ]);

  return {
    db,
    repo: getOfflineRepo(config.databasePath),
    liveRepo: getLiveRepo(),
    dbPath: config.databasePath,
    hasExplicitDbPath: Boolean(process.env.VIBECANVAS_DB),
  };
}

export { openOfflineCanvasState, createLiveRepo, resolveLiveAutomergeUrl };
