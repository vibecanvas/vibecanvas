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

  test('prefers --port over numeric positional subcommand', () => {
    const parsed = parseCliArgv(['bun', 'run', '4000', '--port', '5000']);

    expect(parsed.command).toBe('serve');
    expect(parsed.subcommand).toBe('4000');
    expect(parsed.port).toBe(5000);
  });

  test('throws on invalid ports', () => {
    expect(() => parseCliArgv(['bun', 'run', 'serve', '--port', '0'])).toThrow('Invalid port: 0');
    expect(() => parseCliArgv(['bun', 'run', 'serve', '--port', '70000'])).toThrow('Invalid port: 70000');
    expect(() => parseCliArgv(['bun', 'run', 'serve', '--port', 'abc'])).toThrow('Invalid port: abc');
  });
});
