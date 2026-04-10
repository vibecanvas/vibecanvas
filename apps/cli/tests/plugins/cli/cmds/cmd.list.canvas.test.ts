import { afterEach, describe, expect, test } from 'bun:test';
import { createCliTestContext, expectExitCode, expectNoStderr, parseJsonStdout, type TCliTestContext } from '../harness';

type TCanvasListEntry = {
  id: string;
  name: string;
  createdAt: string;
  automergeUrl: string;
};

type TCanvasListJson = {
  ok: true;
  command: 'canvas';
  subcommand: 'list';
  dbPath: string;
  count: number;
  canvases: TCanvasListEntry[];
};

const activeContexts = new Set<TCliTestContext>();

async function createContext(): Promise<TCliTestContext> {
  const context = await createCliTestContext();
  activeContexts.add(context);
  return context;
}

function toIsoString(value: number | string | Date): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return new Date(value * 1000).toISOString();
  return new Date(value).toISOString();
}

afterEach(async () => {
  for (const context of activeContexts) {
    await context.cleanup();
  }
  activeContexts.clear();
});

describe('vibecanvas canvas list', () => {
  test('prints a stable empty-db human output', async () => {
    const context = await createContext();
    const result = await context.runCanvasCli(['list']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(result.stdout).toBe(`Canvas inventory: 0 canvases in ${context.dbPath}\n`);
  });

  test('prints multiple canvases in deterministic createdAt-then-name order', async () => {
    const context = await createContext();
    const gamma = await context.seedCanvasFixture({ name: 'gamma', createdAtUnixSeconds: 1700000200 });
    const beta = await context.seedCanvasFixture({ name: 'beta', createdAtUnixSeconds: 1700000300 });
    const alpha = await context.seedCanvasFixture({ name: 'alpha', createdAtUnixSeconds: 1700000300 });

    const result = await context.runCanvasCli(['list']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(result.stdout).toBe(
      `Canvas inventory: 3 canvases in ${context.dbPath}\n`
      + `- id=${gamma.canvas.id} name=${JSON.stringify(gamma.canvas.name)} createdAt=${toIsoString(gamma.canvas.created_at)} automergeUrl=${gamma.automergeUrl}\n`
      + `- id=${alpha.canvas.id} name=${JSON.stringify(alpha.canvas.name)} createdAt=${toIsoString(alpha.canvas.created_at)} automergeUrl=${alpha.automergeUrl}\n`
      + `- id=${beta.canvas.id} name=${JSON.stringify(beta.canvas.name)} createdAt=${toIsoString(beta.canvas.created_at)} automergeUrl=${beta.automergeUrl}\n`,
    );
  });

  test('emits a stable --json output contract', async () => {
    const context = await createContext();
    const alpha = await context.seedCanvasFixture({ name: 'alpha', createdAtUnixSeconds: 1700000300 });
    const beta = await context.seedCanvasFixture({ name: 'beta', createdAtUnixSeconds: 1700000400 });

    const result = await context.runCanvasCli(['list', '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<TCanvasListJson>(result)).toEqual({
      ok: true,
      command: 'canvas',
      subcommand: 'list',
      dbPath: context.dbPath,
      count: 2,
      canvases: [
        {
          id: alpha.canvas.id,
          name: alpha.canvas.name,
          createdAt: toIsoString(alpha.canvas.created_at),
          automergeUrl: alpha.automergeUrl,
        },
        {
          id: beta.canvas.id,
          name: beta.canvas.name,
          createdAt: toIsoString(beta.canvas.created_at),
          automergeUrl: beta.automergeUrl,
        },
      ],
    });
  });
});
