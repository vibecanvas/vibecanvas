import { describe, expect, test } from 'bun:test';
import { buildCliConfig } from '../src/build-config';
import { parseCliArgv } from '../src/parse-argv';

describe('parseCliArgv command resolution', () => {
  test('defaults to serve when no subcommand is provided', () => {
    const parsed = parseCliArgv(['bun', 'run']);

    expect(parsed.command).toBe('serve');
    expect(parsed.subcommand).toBeUndefined();
    expect(parsed.port).toBeUndefined();
  });

  test('treats numeric third positional as serve port', () => {
    const parsed = parseCliArgv(['bun', 'run', '4123']);

    expect(parsed.command).toBe('serve');
    expect(parsed.subcommand).toBeUndefined();
    expect(parsed.port).toBe(4123);
  });

  test('resolves known commands and canvas leaf subcommands', () => {
    expect(parseCliArgv(['bun', 'run', 'serve'])).toMatchObject({ command: 'serve', subcommand: undefined });
    expect(parseCliArgv(['bun', 'run', 'canvas'])).toMatchObject({ command: 'canvas', subcommand: undefined });
    expect(parseCliArgv(['bun', 'run', 'canvas', 'query'])).toMatchObject({ command: 'canvas', subcommand: 'query' });
    expect(parseCliArgv(['bun', 'run', 'canvas', 'move'])).toMatchObject({ command: 'canvas', subcommand: 'move' });
    expect(parseCliArgv(['bun', 'run', 'canvas', 'patch'])).toMatchObject({ command: 'canvas', subcommand: 'patch' });
    expect(parseCliArgv(['bun', 'run', 'canvas', 'delete'])).toMatchObject({ command: 'canvas', subcommand: 'delete' });
    expect(parseCliArgv(['bun', 'run', 'canvas', 'reorder'])).toMatchObject({ command: 'canvas', subcommand: 'reorder' });
    expect(parseCliArgv(['bun', 'run', 'canvas', 'group'])).toMatchObject({ command: 'canvas', subcommand: 'group' });
    expect(parseCliArgv(['bun', 'run', 'canvas', 'ungroup'])).toMatchObject({ command: 'canvas', subcommand: 'ungroup' });
    expect(parseCliArgv(['bun', 'run', 'upgrade'])).toMatchObject({ command: 'upgrade', subcommand: undefined });
  });

  test('treats leading flag as serve command', () => {
    const parsed = parseCliArgv(['bun', 'run', '--help']);

    expect(parsed.command).toBe('serve');
    expect(parsed.subcommand).toBeUndefined();
    expect(parsed.helpRequested).toBe(true);
  });

  test('returns unknown for unsupported commands', () => {
    const parsed = parseCliArgv(['bun', 'run', 'deploy']);

    expect(parsed.command).toBe('unknown');
    expect(parsed.subcommand).toBe('deploy');
  });

  test('keeps parsing the canvas leaf subcommand when flags appear between command tokens', () => {
    const parsed = parseCliArgv(['bun', 'run', 'canvas', '--db', './tmp/dev.sqlite', 'query', '--canvas-name', 'ok']);

    expect(parsed.command).toBe('canvas');
    expect(parsed.subcommand).toBe('query');
    expect(parsed.dbPath).toBe('./tmp/dev.sqlite');
    expect(parsed.subcommandOptions).toMatchObject({
      canvasNameQuery: 'ok',
    });
  });

  test('keeps parsing the correct canvas leaf subcommand when unrelated flags and values appear before it', () => {
    const parsed = parseCliArgv(['bun', 'run', 'canvas', '--port', '3900', '--db', './tmp/dev.sqlite', 'move', '--canvas-name', 'ok', '--x', '1', '--y', '2']);

    expect(parsed.command).toBe('canvas');
    expect(parsed.subcommand).toBe('move');
    expect(parsed.port).toBe(3900);
    expect(parsed.dbPath).toBe('./tmp/dev.sqlite');
    expect(parsed.subcommandOptions).toMatchObject({
      canvasNameQuery: 'ok',
      x: '1',
      y: '2',
    });
  });

  test('carries parsed subcommandOptions into buildCliConfig', () => {
    const parsed = parseCliArgv(['bun', 'run', 'canvas', 'query', '--canvas-name', 'ok', '--id', 'a,b', '--output', 'focused', '--omitdata']);
    const config = buildCliConfig(parsed);

    expect(config.command).toBe('canvas');
    expect(config.subcommand).toBe('query');
    expect(config.subcommandOptions).toMatchObject({
      canvasNameQuery: 'ok',
      ids: ['a', 'b'],
      output: 'focused',
      omitData: true,
    });
  });

  test('does not mistake a later positional for the top-level command', () => {
    const parsed = parseCliArgv(['bun', 'run', 'serve', '--db', './tmp/dev.sqlite', 'query']);

    expect(parsed.command).toBe('serve');
    expect(parsed.subcommand).toBeUndefined();
    expect(parsed.dbPath).toBe('./tmp/dev.sqlite');
  });
});
