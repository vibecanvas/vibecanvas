import { describe, expect, test } from 'bun:test';
import { bootCliRuntime, createCliHooks, shutdownCliRuntime } from '../src/hooks';

describe('cli runtime hooks', () => {
  test('boots in boot -> registerCommands -> ready order', async () => {
    const hooks = createCliHooks();
    const calls: string[] = [];

    hooks.boot.tapPromise(async () => {
      calls.push('boot');
    });
    hooks.registerCommands.tap(() => {
      calls.push('registerCommands');
    });
    hooks.ready.tap(() => {
      calls.push('ready');
    });

    await bootCliRuntime({ hooks } as any);

    expect(calls).toEqual(['boot', 'registerCommands', 'ready']);
  });

  test('runs shutdown hook on shutdown', async () => {
    const hooks = createCliHooks();
    const calls: string[] = [];

    hooks.shutdown.tapPromise(async () => {
      calls.push('shutdown');
    });

    await shutdownCliRuntime({ hooks } as any);

    expect(calls).toEqual(['shutdown']);
  });
});
