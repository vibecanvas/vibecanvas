import { describe, expect, test } from 'bun:test';
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
    expect(parsed.subcommand).toBe('4123');
    expect(parsed.port).toBe(4123);
  });

  test('resolves known subcommands', () => {
    expect(parseCliArgv(['bun', 'run', 'serve']).command).toBe('serve');
    expect(parseCliArgv(['bun', 'run', 'canvas']).command).toBe('canvas');
    expect(parseCliArgv(['bun', 'run', 'upgrade']).command).toBe('upgrade');
  });

  test('treats leading flag as serve command', () => {
    const parsed = parseCliArgv(['bun', 'run', '--help']);

    expect(parsed.command).toBe('serve');
    expect(parsed.subcommand).toBeUndefined();
    expect(parsed.helpRequested).toBe(true);
  });

  test('returns unknown for unsupported subcommands', () => {
    const parsed = parseCliArgv(['bun', 'run', 'deploy']);

    expect(parsed.command).toBe('unknown');
    expect(parsed.subcommand).toBe('deploy');
  });
});
