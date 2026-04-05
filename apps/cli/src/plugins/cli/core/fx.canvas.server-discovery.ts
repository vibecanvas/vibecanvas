import type { ICliConfig } from '@vibecanvas/cli/config';

export type TCanvasServerHealth = {
  ok: true;
  service: 'vibecanvas';
  version: string;
  compiled: boolean;
  port: number;
};

function getDefaultPort(compiled: boolean): number {
  return compiled ? 7496 : 3000;
}

function getPortCandidates(preferredPort: number, compiled: boolean): number[] {
  const ports = new Set<number>();
  ports.add(preferredPort);

  const fallbackStart = getDefaultPort(compiled);
  const span = compiled ? 100 : 8;
  for (let offset = 0; offset < span; offset += 1) {
    ports.add(fallbackStart + offset);
  }

  return [...ports];
}

async function readHealth(port: number): Promise<TCanvasServerHealth | null> {
  console.log('reading health')
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(250),
    });
    console.log('5', response)
    if (!response.ok) return null;
    const payload = await response.json() as Partial<TCanvasServerHealth>;
    if (payload.ok !== true) return null;
    if (payload.service !== 'vibecanvas') return null;
    if (typeof payload.version !== 'string') return null;
    if (typeof payload.compiled !== 'boolean') return null;
    return {
      ok: true,
      service: 'vibecanvas',
      version: payload.version,
      compiled: payload.compiled,
      port,
    };
  } catch (error) {
    console.log('error', error)
    return null;
  }
}

export async function fxDiscoverLocalCanvasServer(portal: {}, args: { config: ICliConfig }): Promise<TCanvasServerHealth | null> {
  console.log('1')
  const candidates = getPortCandidates(args.config.port, args.config.compiled);
  console.log('2')

  for (const port of candidates) {
    console.log('3', port)
    const health = await readHealth(port);
    console.log('4', health)
    if (health) return health;
  }

  return null;
}