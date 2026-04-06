import { afterEach, describe, expect, test } from 'bun:test';
import { createCliTestContext, createGroup, createRectElement, expectExitCode, expectNoStderr, parseJsonStdout, type TCliTestContext } from '../../../cli/harness';

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

describe('canvas CLI query filter combinations', () => {
  test('cross-filters subtree, type, and style via --query', async () => {
    const context = await createContext();
    const rootGroup = createGroup({ id: 'group-root', zIndex: 'a0' });
    const childGroup = createGroup({ id: 'group-child', parentGroupId: rootGroup.id, zIndex: 'a1' });
    const redInside = createRectElement({
      id: 'rect-red-inside',
      parentGroupId: childGroup.id,
      zIndex: 'a2',
      style: { backgroundColor: '#ff0000', strokeColor: '#aa0000', strokeWidth: 2, opacity: 0.8 },
    });
    const blueInside = createRectElement({
      id: 'rect-blue-inside',
      parentGroupId: childGroup.id,
      zIndex: 'a3',
      style: { backgroundColor: '#0000ff', strokeColor: '#0000aa', strokeWidth: 2, opacity: 0.8 },
    });
    const redOutside = createRectElement({
      id: 'rect-red-outside',
      parentGroupId: null,
      zIndex: 'a4',
      style: { backgroundColor: '#ff0000', strokeColor: '#aa0000', strokeWidth: 2, opacity: 0.8 },
    });

    const seeded = await context.seedCanvasFixture({
      name: 'query-crossfilter-query-canvas',
      groups: { [rootGroup.id]: rootGroup, [childGroup.id]: childGroup },
      elements: {
        [redInside.id]: redInside,
        [blueInside.id]: blueInside,
        [redOutside.id]: redOutside,
      },
    });

    const result = await context.runCanvasCli([
      'query',
      '--canvas',
      seeded.canvas.id,
      '--query',
      JSON.stringify({
        subtree: rootGroup.id,
        types: ['rect'],
        style: { backgroundColor: '#ff0000' },
      }),
      '--json',
    ]);

    expectExitCode(result, 0);
    expectNoStderr(result);

    const parsed = parseJsonStdout<{
      count: number;
      selector: { source: string; filters: { subtree: string; types: string[]; style: Record<string, string> } };
      matches: Array<{ metadata: { id: string; kind: string; type: string | null } }>;
    }>(result);

    expect(parsed).toMatchObject({
      count: 1,
      selector: {
        source: 'query',
        filters: {
          subtree: 'group-root',
          types: ['rect'],
          style: { backgroundColor: '#ff0000' },
        },
      },
      matches: [{ metadata: { id: 'rect-red-inside', kind: 'element', type: 'rect' } }],
    });
  });

  test('cross-filters kind=group with subtree and bounds-mode contains', async () => {
    const context = await createContext();
    const rootGroup = createGroup({ id: 'group-root', zIndex: 'a0' });
    const childGroup = createGroup({ id: 'group-child', parentGroupId: rootGroup.id, zIndex: 'a1' });
    const childElement = createRectElement({
      id: 'rect-child',
      parentGroupId: childGroup.id,
      x: 10,
      y: 20,
      zIndex: 'a2',
      data: { w: 40, h: 50 },
    });
    const rootWideElement = createRectElement({
      id: 'rect-root-wide',
      parentGroupId: rootGroup.id,
      x: 300,
      y: 300,
      zIndex: 'a3',
      data: { w: 150, h: 120 },
    });

    const seeded = await context.seedCanvasFixture({
      name: 'query-group-bounds-canvas',
      groups: { [rootGroup.id]: rootGroup, [childGroup.id]: childGroup },
      elements: { [childElement.id]: childElement, [rootWideElement.id]: rootWideElement },
    });

    const result = await context.runCanvasCli([
      'query',
      '--canvas',
      seeded.canvas.id,
      '--kind',
      'group',
      '--subtree',
      rootGroup.id,
      '--bounds',
      '0,0,100,100',
      '--bounds-mode',
      'contains',
      '--json',
    ]);

    expectExitCode(result, 0);
    expectNoStderr(result);

    const parsed = parseJsonStdout<{
      count: number;
      matches: Array<{ metadata: { id: string; kind: string; bounds: { x: number; y: number; w: number; h: number } | null } }>;
    }>(result);

    expect(parsed).toMatchObject({
      count: 1,
      matches: [
        {
          metadata: {
            id: 'group-child',
            kind: 'group',
            bounds: { x: 10, y: 20, w: 40, h: 50 },
          },
        },
      ],
    });
  });

  test('cross-filters direct-group, kind, and style via --where', async () => {
    const context = await createContext();
    const rootGroup = createGroup({ id: 'group-root', zIndex: 'a0' });
    const childGroup = createGroup({ id: 'group-child', parentGroupId: rootGroup.id, zIndex: 'a1' });
    const directRed = createRectElement({
      id: 'rect-direct-red',
      parentGroupId: rootGroup.id,
      zIndex: 'a2',
      style: { backgroundColor: '#ff0000', strokeColor: '#aa0000', strokeWidth: 2, opacity: 0.8 },
    });
    const directBlue = createRectElement({
      id: 'rect-direct-blue',
      parentGroupId: rootGroup.id,
      zIndex: 'a3',
      style: { backgroundColor: '#0000ff', strokeColor: '#0000aa', strokeWidth: 2, opacity: 0.8 },
    });
    const nestedRed = createRectElement({
      id: 'rect-nested-red',
      parentGroupId: childGroup.id,
      zIndex: 'a4',
      style: { backgroundColor: '#ff0000', strokeColor: '#aa0000', strokeWidth: 2, opacity: 0.8 },
    });

    const seeded = await context.seedCanvasFixture({
      name: 'query-crossfilter-where-canvas',
      groups: { [rootGroup.id]: rootGroup, [childGroup.id]: childGroup },
      elements: {
        [directRed.id]: directRed,
        [directBlue.id]: directBlue,
        [nestedRed.id]: nestedRed,
      },
    });

    const result = await context.runCanvasCli([
      'query',
      '--canvas',
      seeded.canvas.id,
      '--where',
      `group=${rootGroup.id}&kind=element&style.backgroundColor=%23ff0000`,
      '--json',
    ]);

    expectExitCode(result, 0);
    expectNoStderr(result);

    const parsed = parseJsonStdout<{
      count: number;
      selector: { source: string; filters: { group: string | null; kinds: string[]; style: Record<string, string> } };
      matches: Array<{ metadata: { id: string; parentGroupId: string | null } }>;
    }>(result);

    expect(parsed).toMatchObject({
      count: 1,
      selector: {
        source: 'where',
        filters: {
          group: 'group-root',
          kinds: ['element'],
          style: { backgroundColor: '#ff0000' },
        },
      },
      matches: [{ metadata: { id: 'rect-direct-red', parentGroupId: 'group-root' } }],
    });
  });
});
