import { afterEach, describe, expect, mock, test } from 'bun:test';
import { serveWithPortFallback } from '../src/plugins/server/ServerPlugin';

describe('serveWithPortFallback', () => {
  const originalWarn = console.warn;

  afterEach(() => {
    console.warn = originalWarn;
  });

  test('keeps the preferred port when it is available', () => {
    const serve = mock((port: number) => ({ port, stop() {} }) as ReturnType<typeof Bun.serve>);

    const server = serveWithPortFallback(serve, 7496, true);

    expect(serve).toHaveBeenCalledTimes(1);
    expect(serve).toHaveBeenCalledWith(7496);
    expect(server.port).toBe(7496);
  });

  test('retries the next port in compiled mode when the preferred port is busy', () => {
    const warn = mock(() => {});
    console.warn = warn;

    const serve = mock((port: number) => {
      if (port === 7496) throw new Error('busy');
      return { port, stop() {} } as ReturnType<typeof Bun.serve>;
    });

    const server = serveWithPortFallback(serve, 7496, true);

    expect(serve).toHaveBeenCalledTimes(2);
    expect(serve.mock.calls.map(([port]) => port)).toEqual([7496, 7497]);
    expect(server.port).toBe(7497);
    expect(warn).toHaveBeenCalledWith('[Server] Port 7496 is busy, using 7497');
  });

  test('stays strict in dev mode and does not retry', () => {
    const serve = mock((_port: number) => {
      throw new Error('busy');
    });

    expect(() => serveWithPortFallback(serve, 3000, false)).toThrow('busy');
    expect(serve).toHaveBeenCalledTimes(1);
    expect(serve).toHaveBeenCalledWith(3000);
  });
});
