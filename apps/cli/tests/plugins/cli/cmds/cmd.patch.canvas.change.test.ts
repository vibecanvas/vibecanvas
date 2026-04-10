import { afterEach, describe, expect, test } from 'bun:test';
import { createCliTestContext, expectExitCode, expectNoStderr, type TCliTestContext } from '../harness';

const contexts: TCliTestContext[] = [];

afterEach(async () => {
  while (contexts.length > 0) {
    await contexts.pop()?.cleanup();
  }
});

async function createContext(): Promise<TCliTestContext> {
  const context = await createCliTestContext();
  contexts.push(context);
  return context;
}

describe('canvas CLI patch schema help', () => {
  test('supports filtered schema help blocks', async () => {
    const context = await createContext();

    const filteredHelpResult = await context.runCanvasCli(['patch', '--help', '--schema', 'group']);
    expectExitCode(filteredHelpResult, 0);
    expectNoStderr(filteredHelpResult);
    expect(filteredHelpResult.stdout).toContain('Schema filter:');
    expect(filteredHelpResult.stdout).toContain('group');
    expect(filteredHelpResult.stdout).toContain('zGroup');
    expect(filteredHelpResult.stdout).not.toContain('zRectData');
    expect(filteredHelpResult.stdout).toContain('packages/service-automerge/src/types/canvas-doc.zod.ts');
  });

  test('prints patch schema without requiring ids or patch source', async () => {
    const context = await createContext();

    const result = await context.runCanvasCli(['patch', '--schema', 'group']);

    expectExitCode(result, 0);
    expectNoStderr(result);
    expect(result.stdout).toContain('Schema filter:');
    expect(result.stdout).toContain('group');
    expect(result.stdout).toContain('zGroup');
    expect(result.stdout).not.toContain('Patch requires exactly one patch source');
  });
});
