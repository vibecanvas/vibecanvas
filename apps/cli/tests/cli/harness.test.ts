import { access } from 'node:fs/promises';
import { afterEach, describe, expect, test } from 'bun:test';
import { createCliTestContext, createGroup, createRectElement, expectExitCode, expectNoStderr, parseJsonStdout, type TCliTestContext } from './harness';

const activeContexts = new Set<TCliTestContext>();

async function createContext(): Promise<TCliTestContext> {
  const context = await createCliTestContext();
  activeContexts.add(context);
  return context;
}

afterEach(async () => {
  for (const context of activeContexts) {
    await context.cleanup();
  }
  activeContexts.clear();
});

describe('canvas CLI test harness', () => {
  test('creates a brand-new migrated sqlite sandbox for every test context', async () => {
    const first = await createContext();
    const second = await createContext();

    expect(first.tempRoot).not.toBe(second.tempRoot);
    expect(first.dbPath).not.toBe(second.dbPath);
    await access(first.dbPath);
    await access(second.dbPath);
    expect(await first.listCanvases()).toEqual([]);
    expect(await second.listCanvases()).toEqual([]);
  });

  test('seeds isolated canvas rows and persisted automerge docs for future CLI tests', async () => {
    const context = await createContext();
    const rect = createRectElement({ id: 'rect-1', x: 40, y: 80, zIndex: 'a1' });
    const group = createGroup({ id: 'group-1', zIndex: 'a2' });
    const seeded = await context.seedCanvasFixture({ name: 'cli-seeded-canvas', elements: { [rect.id]: rect }, groups: { [group.id]: group } });

    const rows = await context.listCanvases();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(seeded.canvas.id);
    expect(rows[0]?.name).toBe('cli-seeded-canvas');

    const doc = await context.readCanvasDoc(seeded.automergeUrl);
    expect(doc.name).toBe('cli-seeded-canvas');
    expect(doc.elements[rect.id]?.x).toBe(40);
    expect(doc.elements[rect.id]?.y).toBe(80);
    expect(doc.groups[group.id]?.id).toBe(group.id);
  });

  test('standardizes subprocess assertions for exit code stdout stderr and json payloads', async () => {
    const context = await createContext();
    const result = await context.runProcess({ cmd: ['bun', '-e', 'console.log(JSON.stringify({ ok: true, value: 7 })); console.error("warn"); process.exit(3)'] });

    expectExitCode(result, 3);
    expect(result.stderr).toContain('warn');
    expect(parseJsonStdout<{ ok: boolean; value: number }>(result)).toEqual({ ok: true, value: 7 });
  });

  test('runs the real vibecanvas CLI entry point end to end', async () => {
    const context = await createContext();
    const result = await context.runVibecanvasCli(['--help']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('Commands:');
    expect(result.stdout).toContain('Canvas subcommands:');
    expect(result.stdout).toContain('list      List canvases in the local database');
    expect(result.stdout).toContain('query     Run structured readonly canvas queries');
    expect(result.stdout).toContain('move      Move explicit element/group ids deterministically');
    expect(result.stdout).toContain('Any subcommand accepts --help for command-specific usage.');
    expect(result.stdout).toContain('vibecanvas query --help');
  });

  test('shows command-specific help when a canvas subcommand is present', async () => {
    const context = await createContext();

    const listHelp = await context.runVibecanvasCli(['canvas', 'list', '--help']);
    expectExitCode(listHelp, 0);
    expectNoStderr(listHelp);
    expect(listHelp.stdout).toContain('Usage: vibecanvas canvas list [options]');
    expect(listHelp.stdout).toContain('Ordering:');

    const queryHelp = await context.runVibecanvasCli(['canvas', 'query', '--help']);
    expectExitCode(queryHelp, 0);
    expectNoStderr(queryHelp);
    expect(queryHelp.stdout).toContain('Usage: vibecanvas canvas query [options]');
    expect(queryHelp.stdout).toContain('Selector inputs (choose at most one style):');
    expect(queryHelp.stdout).toContain('--style <key=value>');
    expect(queryHelp.stdout).toContain('--omitdata');
    expect(queryHelp.stdout).toContain('--omitstyle');
    expect(queryHelp.stdout).toContain('query never performs natural-language parsing.');

    const moveHelp = await context.runVibecanvasCli(['canvas', 'move', '--help']);
    expectExitCode(moveHelp, 0);
    expectNoStderr(moveHelp);
    expect(moveHelp.stdout).toContain('Usage: vibecanvas canvas move [options]');
    expect(moveHelp.stdout).toContain('--relative');
    expect(moveHelp.stdout).toContain('--absolute');
    expect(moveHelp.stdout).toContain('group ids move their descendant elements');
  });

  test('shows canvas subcommand help even when the canvas prefix is omitted', async () => {
    const context = await createContext();

    const queryHelp = await context.runVibecanvasCli(['query', '--help']);
    expectExitCode(queryHelp, 0);
    expectNoStderr(queryHelp);
    expect(queryHelp.stdout).toContain('Usage: vibecanvas canvas query [options]');
    expect(queryHelp.stdout).toContain('--style <key=value>');

    const moveHelp = await context.runVibecanvasCli(['move', '--help']);
    expectExitCode(moveHelp, 0);
    expectNoStderr(moveHelp);
    expect(moveHelp.stdout).toContain('Usage: vibecanvas canvas move [options]');

    const listHelp = await context.runVibecanvasCli(['list', '--help']);
    expectExitCode(listHelp, 0);
    expectNoStderr(listHelp);
    expect(listHelp.stdout).toContain('Usage: vibecanvas canvas list [options]');
  });

  test('makes subcommand arguments visible in the top-level canvas help menu', async () => {
    const context = await createContext();
    const result = await context.runVibecanvasCli(['canvas', '--help']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(result.stdout).toContain('query (--canvas <id> | --canvas-name <query>) [selectors]');
    expect(result.stdout).toContain("Use 'vibecanvas canvas <subcommand> --help' for command-specific arguments and examples.");
  });

  test('runs the real canvas CLI path with explicit isolated --db wiring', async () => {
    const context = await createContext();
    const result = await context.runCanvasCli(['list', '--json']);

    expectExitCode(result, 0);
    expectNoStderr(result);

    const payload = parseJsonStdout<{ ok: boolean; command: string; subcommand: string; dbPath: string; count: number; canvases: unknown[] }>(result);
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe('canvas');
    expect(payload.subcommand).toBe('list');
    expect(payload.dbPath).toBe(context.dbPath);
    expect(payload.count).toBe(0);
    expect(payload.canvases).toEqual([]);
  });
});
