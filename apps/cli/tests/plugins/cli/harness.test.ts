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
    expect(result.stdout).toContain('list      List canvases in the selected database');
    expect(result.stdout).toContain('query     Run structured readonly canvas queries');
    expect(result.stdout).toContain('add       Add primitive elements to one canvas');
    expect(result.stdout).toContain('move      Move explicit element/group ids deterministically');
    expect(result.stdout).toContain('patch     Patch explicit element/group ids with structured field updates');
    expect(result.stdout).toContain('Help ladder:');
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

    const addHelp = await context.runVibecanvasCli(['canvas', 'add', '--help']);
    expectExitCode(addHelp, 0);
    expectNoStderr(addHelp);
    expect(addHelp.stdout).toContain('Usage: vibecanvas canvas add [options]');
    expect(addHelp.stdout).toContain('--element <json>');
    expect(addHelp.stdout).toContain('--elements-file <path>');
    expect(addHelp.stdout).toContain('--elements-stdin');

    const moveHelp = await context.runVibecanvasCli(['canvas', 'move', '--help']);
    expectExitCode(moveHelp, 0);
    expectNoStderr(moveHelp);
    expect(moveHelp.stdout).toContain('Usage: vibecanvas canvas move [options]');
    expect(moveHelp.stdout).toContain('--relative');
    expect(moveHelp.stdout).toContain('--absolute');
    expect(moveHelp.stdout).toContain('group ids move their descendant elements');

    const patchHelp = await context.runVibecanvasCli(['canvas', 'patch', '--help']);
    expectExitCode(patchHelp, 0);
    expectNoStderr(patchHelp);
    expect(patchHelp.stdout).toContain('Usage: vibecanvas canvas patch [options]');
    expect(patchHelp.stdout).toContain('--patch <json>');
    expect(patchHelp.stdout).toContain('--patch-file <path>');
    expect(patchHelp.stdout).toContain('--patch-stdin');
    expect(patchHelp.stdout).toContain('Patch envelope:');
    expect(patchHelp.stdout).toContain('{"element":{...}}');
    expect(patchHelp.stdout).toContain('{"group":{...}}');
  });

  test('shows canvas subcommand help even when the canvas prefix is omitted', async () => {
    const context = await createContext();

    const queryHelp = await context.runVibecanvasCli(['query', '--help']);
    expectExitCode(queryHelp, 0);
    expectNoStderr(queryHelp);
    expect(queryHelp.stdout).toContain('Usage: vibecanvas canvas query [options]');
    expect(queryHelp.stdout).toContain('--style <key=value>');

    const addHelp = await context.runVibecanvasCli(['add', '--help']);
    expectExitCode(addHelp, 0);
    expectNoStderr(addHelp);
    expect(addHelp.stdout).toContain('Usage: vibecanvas canvas add [options]');

    const moveHelp = await context.runVibecanvasCli(['move', '--help']);
    expectExitCode(moveHelp, 0);
    expectNoStderr(moveHelp);
    expect(moveHelp.stdout).toContain('Usage: vibecanvas canvas move [options]');

    const patchHelp = await context.runVibecanvasCli(['patch', '--help']);
    expectExitCode(patchHelp, 0);
    expectNoStderr(patchHelp);
    expect(patchHelp.stdout).toContain('Usage: vibecanvas canvas patch [options]');

    const listHelp = await context.runVibecanvasCli(['list', '--help']);
    expectExitCode(listHelp, 0);
    expectNoStderr(listHelp);
    expect(listHelp.stdout).toContain('Usage: vibecanvas canvas list [options]');
  });

  test('runs top-level canvas aliases against the same implementation', async () => {
    const context = await createContext();
    const seeded = await context.seedCanvasFixture({ name: 'alias-canvas' });

    const result = await context.runVibecanvasCli(['query', '--canvas', seeded.canvas.id, '--json', '--db', context.dbPath]);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(parseJsonStdout<{ ok: boolean; command: string; canvas: { id: string } }>(result)).toMatchObject({
      ok: true,
      command: 'canvas.query',
      canvas: { id: seeded.canvas.id },
    });
  });

  test('makes subcommand arguments visible in the top-level canvas help menu', async () => {
    const context = await createContext();
    const result = await context.runVibecanvasCli(['canvas', '--help']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(result.stdout).toContain('query (--canvas <id> | --canvas-name <query>) [selectors]');
    expect(result.stdout).toContain('add (--canvas <id> | --canvas-name <query>) [element source]');
    expect(result.stdout).toContain('Next steps:');
    expect(result.stdout).toContain("Use 'vibecanvas canvas <subcommand> --help' for command-specific arguments and examples.");
  });

  test('suggests nearest commands for unknown root and canvas subcommands', async () => {
    const context = await createContext();

    const rootUnknown = await context.runVibecanvasCli(['qurey', '--json']);
    expectExitCode(rootUnknown, 1);
    expect(rootUnknown.stdout).toBe('');
    expect(JSON.parse(rootUnknown.stderr)).toMatchObject({
      ok: false,
      command: 'cli',
      code: 'CLI_COMMAND_UNKNOWN',
      hint: "Did you mean 'query'?",
      next: 'Try: vibecanvas query --help',
      suggestions: ['query'],
    });

    const canvasUnknown = await context.runVibecanvasCli(['canvas', 'gruop', '--help', '--json']);
    expectExitCode(canvasUnknown, 1);
    expect(canvasUnknown.stdout).toBe('');
    expect(JSON.parse(canvasUnknown.stderr)).toMatchObject({
      ok: false,
      command: 'canvas',
      code: 'CANVAS_SUBCOMMAND_UNKNOWN',
      hint: "Did you mean 'group'?",
      next: 'Try: vibecanvas group --help',
      suggestions: ['group'],
    });
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
