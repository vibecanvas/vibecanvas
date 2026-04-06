import { describe, expect, test } from 'bun:test';
import { setupServices } from '../src/setup-services';
import type { ICliConfig } from '../src/config';

function createConfig(overrides?: Partial<ICliConfig>): ICliConfig {
  return {
    cwd: process.cwd(),
    dev: true,
    compiled: false,
    version: '0.0.0',
    command: 'serve',
    rawArgv: ['bun', 'run'],
    argv: [],
    port: 3000,
    dataPath: `/tmp/vibecanvas-test-${crypto.randomUUID()}`,
    dbPath: `/tmp/vibecanvas-test-${crypto.randomUUID()}.sqlite`,
    configPath: `/tmp/vibecanvas-test-${crypto.randomUUID()}.json`,
    cachePath: `/tmp/vibecanvas-test-${crypto.randomUUID()}`,
    helpRequested: false,
    versionRequested: false,
    ...overrides,
  };
}

describe('setupServices PTY wiring', () => {
  test('provides pty service in serve mode', async () => {
    const { services } = setupServices(createConfig());
    const pty = services.get('pty');

    expect(pty?.name).toBe('pty');

    await pty?.stop?.();
    await services.get('db')?.stop?.();
  });

  test('provides pty service outside serve mode too', async () => {
    const { services } = setupServices(createConfig({ command: 'canvas' }));
    const pty = services.get('pty');

    expect(pty?.name).toBe('pty');

    await pty?.stop?.();
    await services.get('db')?.stop?.();
  });
});
