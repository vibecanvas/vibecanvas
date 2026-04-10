import { describe, expect, test } from 'bun:test';
import { parseCliArgv } from '../src/parse-argv';

describe('parseCliArgv flag parsing', () => {
  test('reads explicit option values', () => {
    const parsed = parseCliArgv([
      'bun',
      'run',
      'serve',
      '--port',
      '3001',
      '--db',
      './tmp/dev.sqlite',
      '--upgrade',
      '1.2.3',
    ]);

    expect(parsed.port).toBe(3001);
    expect(parsed.dbPath).toBe('./tmp/dev.sqlite');
    expect(parsed.upgradeTarget).toBe('1.2.3');
  });

  test('reads help and version short flags', () => {
    const parsed = parseCliArgv(['bun', 'run', 'serve', '-h', '-v']);

    expect(parsed.helpRequested).toBe(true);
    expect(parsed.versionRequested).toBe(true);
  });

  test('prefers --port over numeric positional command port', () => {
    const parsed = parseCliArgv(['bun', 'run', '4000', '--port', '5000']);

    expect(parsed.command).toBe('serve');
    expect(parsed.subcommand).toBeUndefined();
    expect(parsed.port).toBe(5000);
  });

  test('finds the canvas leaf subcommand even when flags split the command tokens', () => {
    const parsed = parseCliArgv(['bun', 'run', 'canvas', '--port', '3001', 'query', '--canvas-name', 'ok']);

    expect(parsed.command).toBe('canvas');
    expect(parsed.subcommand).toBe('query');
    expect(parsed.port).toBe(3001);
    expect(parsed.subcommandOptions).toMatchObject({
      canvasNameQuery: 'ok',
    });
  });

  test('normalizes single and repeated multi-string options into arrays', () => {
    const single = parseCliArgv(['bun', 'run', 'canvas', 'query', '--kind', 'element', '--type', 'rect', '--style', 'backgroundColor=#fff']);
    expect(single.subcommandOptions).toMatchObject({
      kinds: ['element'],
      types: ['rect'],
      styles: ['backgroundColor=#fff'],
    });

    const repeated = parseCliArgv(['bun', 'run', 'canvas', 'query', '--kind', 'element', '--kind', 'group', '--type', 'rect', '--type', 'text', '--style', 'backgroundColor=#fff', '--style', 'opacity=1']);
    expect(repeated.subcommandOptions).toMatchObject({
      kinds: ['element', 'group'],
      types: ['rect', 'text'],
      styles: ['backgroundColor=#fff', 'opacity=1'],
    });
  });

  test('parses query flags into subcommandOptions', () => {
    const parsed = parseCliArgv([
      'bun',
      'run',
      'canvas',
      'query',
      '--canvas-name',
      'foo',
      '--id',
      'a,b',
      '--id',
      'c',
      '--kind',
      'element',
      '--type',
      'rect',
      '--style',
      'backgroundColor=#fff',
      '--group',
      'group-1',
      '--subtree',
      'group-root',
      '--bounds',
      '0,0,10,10',
      '--bounds-mode',
      'contains',
      '--where',
      'type=rect',
      '--query',
      '{"ids":["a"]}',
      '--output',
      'full',
      '--omitdata',
      '--omitstyle',
      '--json',
    ]);

    expect(parsed.subcommandOptions).toMatchObject({
      json: true,
      canvasNameQuery: 'foo',
      ids: ['a', 'b', 'c'],
      kinds: ['element'],
      types: ['rect'],
      styles: ['backgroundColor=#fff'],
      groupId: 'group-1',
      subtree: 'group-root',
      bounds: '0,0,10,10',
      boundsMode: 'contains',
      where: 'type=rect',
      queryJson: '{"ids":["a"]}',
      output: 'full',
      omitData: true,
      omitStyle: true,
    });
  });

  test('parses move flags into subcommandOptions', () => {
    const parsed = parseCliArgv(['bun', 'run', 'canvas', 'move', '--canvas', 'canvas-1', '--id', 'x,y', '--relative', '--x', '12', '--y', '-9']);

    expect(parsed.subcommandOptions).toMatchObject({
      canvasId: 'canvas-1',
      ids: ['x', 'y'],
      relative: true,
      absolute: false,
      x: '12',
      y: '-9',
    });
  });

  test('parses patch, reorder, delete, group, and ungroup flags into subcommandOptions', () => {
    const patchParsed = parseCliArgv(['bun', 'run', 'canvas', 'patch', '--canvas-name', 'board', '--id', 'rect-1', '--patch', '{"element":{"x":1}}']);
    expect(patchParsed.subcommand).toBe('patch');
    expect(patchParsed.subcommandOptions).toMatchObject({
      canvasNameQuery: 'board',
      ids: ['rect-1'],
      patch: '{"element":{"x":1}}',
    });

    const patchFileParsed = parseCliArgv(['bun', 'run', 'canvas', 'patch', '--patch-file', './patch.json', '--patch-stdin']);
    expect(patchFileParsed.subcommand).toBe('patch');
    expect(patchFileParsed.subcommandOptions).toMatchObject({
      patchFile: './patch.json',
      patchStdin: true,
    });

    const reorderParsed = parseCliArgv(['bun', 'run', 'canvas', 'reorder', '--id', 'one,two', '--action', 'front']);
    expect(reorderParsed.subcommand).toBe('reorder');
    expect(reorderParsed.subcommandOptions).toMatchObject({
      ids: ['one', 'two'],
      action: 'front',
    });

    const deleteParsed = parseCliArgv(['bun', 'run', 'canvas', 'delete', '--id', 'dead']);
    expect(deleteParsed.subcommand).toBe('delete');
    expect(deleteParsed.subcommandOptions).toMatchObject({
      ids: ['dead'],
    });

    const groupParsed = parseCliArgv(['bun', 'run', 'canvas', 'group', '--id', 'a,b']);
    expect(groupParsed.subcommand).toBe('group');
    expect(groupParsed.subcommandOptions).toMatchObject({ ids: ['a', 'b'] });

    const ungroupParsed = parseCliArgv(['bun', 'run', 'canvas', 'ungroup', '--id', 'g1,g2']);
    expect(ungroupParsed.subcommand).toBe('ungroup');
    expect(ungroupParsed.subcommandOptions).toMatchObject({ ids: ['g1', 'g2'] });
  });

  test('throws on invalid ports', () => {
    expect(() => parseCliArgv(['bun', 'run', 'serve', '--port', '0'])).toThrow('Invalid port: 0');
    expect(() => parseCliArgv(['bun', 'run', 'serve', '--port', '70000'])).toThrow('Invalid port: 70000');
    expect(() => parseCliArgv(['bun', 'run', 'serve', '--port', 'abc'])).toThrow('Invalid port: abc');
  });

  test('rejects option tokens as --db values', () => {
    expect(() => parseCliArgv(['bun', 'run', 'canvas', 'list', '--db', '--json'])).toThrow("--db requires a path value. Received option token '--json' instead.");
  });
});
