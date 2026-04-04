import { buildCliConfig } from '../../build-config';
import { parseCliArgv } from '../../parse-argv';

export async function discoverLocalCanvasServer(argv: readonly string[]) {
  const { discoverLocalCanvasServer } = await import('./canvas.server-discovery');
  return discoverLocalCanvasServer(argv);
}

export async function createOfflineCanvasState(argv: readonly string[]) {
  const parsed = parseCliArgv(argv);
  const config = buildCliConfig(parsed);
  const { createLocalCanvasState } = await import('./canvas.local-state');
  return createLocalCanvasState(config);
}

export async function createOnlineCanvasSafeClient(port: number) {
  const { createCanvasSafeClient } = await import('./canvas.online-client');
  return createCanvasSafeClient(port);
}
