import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { PtyServiceBunPty } from '../src/PtyServiceBunPty';

function decodeChunks(chunks: Uint8Array[]) {
  const decoder = new TextDecoder();
  return chunks.map((chunk) => decoder.decode(chunk)).join('');
}

async function waitFor(predicate: () => boolean, timeoutMs = 3000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await Bun.sleep(25);
  }

  throw new Error(`Timed out after ${timeoutMs}ms`);
}

describe('PtyServiceBunPty', () => {
  let service: PtyServiceBunPty;

  beforeEach(() => {
    service = new PtyServiceBunPty();
  });

  afterEach(async () => {
    await service.stop();
  });

  test('create/list/get/update/remove manages PTY sessions', async () => {
    const workingDirectory = process.cwd();
    const created = await service.create('fs-local', workingDirectory, {
      command: '/bin/sh',
      title: 'Test Terminal',
      size: { rows: 30, cols: 120 },
    });

    expect(created.title).toBe('Test Terminal');
    expect(created.command).toBe('/bin/sh');
    expect(created.cwd).toBe(workingDirectory);
    expect(created.rows).toBe(30);
    expect(created.cols).toBe(120);
    expect(created.status).toBe('running');

    const listed = service.list('fs-local', workingDirectory);
    expect(listed.some((pty) => pty.id === created.id)).toBe(true);

    const fetched = service.get('fs-local', workingDirectory, created.id);
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.title).toBe('Test Terminal');

    const updated = service.update('fs-local', workingDirectory, created.id, {
      title: 'Renamed Terminal',
      size: { rows: 40, cols: 140 },
    });
    expect(updated?.title).toBe('Renamed Terminal');
    expect(updated?.rows).toBe(40);
    expect(updated?.cols).toBe(140);

    const removed = await service.remove('fs-local', workingDirectory, created.id);
    expect(removed).toBe(true);
    expect(service.get('fs-local', workingDirectory, created.id)).toBeNull();
  });

  test('attach sends input and receives live output', async () => {
    const workingDirectory = process.cwd();
    const created = await service.create('fs-local', workingDirectory, {
      command: '/bin/sh',
      title: 'Interactive Terminal',
    });

    const chunks: Uint8Array[] = [];
    const attachment = service.attach({
      workingDirectory,
      ptyID: created.id,
      cursor: 0,
      send: (data) => {
        chunks.push(new Uint8Array(data));
      },
    });

    expect(attachment).not.toBeNull();

    attachment!.send("printf 'hello-from-pty\\n'\n");

    await waitFor(() => decodeChunks(chunks).includes('hello-from-pty'));

    attachment!.send('exit\n');
    attachment!.detach();

    expect(decodeChunks(chunks)).toContain('hello-from-pty');
  });

  test('ctrl+c sent through the PTY interrupts the foreground process', async () => {
    const workingDirectory = process.cwd();
    const created = await service.create('fs-local', workingDirectory, {
      command: '/bin/sh',
      title: 'Signal Terminal',
    });

    const chunks: Uint8Array[] = [];
    const attachment = service.attach({
      workingDirectory,
      ptyID: created.id,
      cursor: 0,
      send: (data) => {
        chunks.push(new Uint8Array(data));
      },
    });

    expect(attachment).not.toBeNull();

    attachment!.send("trap 'echo SIGINT_RECEIVED; exit 0' INT\n");
    attachment!.send('echo READY\n');
    attachment!.send('sleep 30\n');
    await waitFor(() => decodeChunks(chunks).includes('READY'));

    attachment!.send('\x03');

    await waitFor(() => decodeChunks(chunks).includes('SIGINT_RECEIVED'), 5000);

    attachment!.detach();
    expect(decodeChunks(chunks)).toContain('SIGINT_RECEIVED');
  });

  test('replays buffered output on reconnect from cursor zero', async () => {
    const workingDirectory = process.cwd();
    const created = await service.create('fs-local', workingDirectory, {
      command: '/bin/sh',
      title: 'Replay Terminal',
    });

    const firstChunks: Uint8Array[] = [];
    const firstAttachment = service.attach({
      workingDirectory,
      ptyID: created.id,
      cursor: 0,
      send: (data) => {
        firstChunks.push(new Uint8Array(data));
      },
    });

    expect(firstAttachment).not.toBeNull();

    firstAttachment!.send("printf 'replay-check\\n'\n");
    await waitFor(() => decodeChunks(firstChunks).includes('replay-check'));
    firstAttachment!.send('exit\n');
    firstAttachment!.detach();

    const replayedChunks: Uint8Array[] = [];
    const secondAttachment = service.attach({
      workingDirectory,
      ptyID: created.id,
      cursor: 0,
      send: (data) => {
        replayedChunks.push(new Uint8Array(data));
      },
    });

    expect(secondAttachment).not.toBeNull();
    await waitFor(() => decodeChunks(replayedChunks).includes('replay-check'));

    expect(decodeChunks(replayedChunks)).toContain('replay-check');
    secondAttachment!.detach();
  });

  test('rejects new PTY creation after stop', async () => {
    await service.stop();

    await expect(service.create('fs-local', process.cwd())).rejects.toThrow('PTY service has been stopped');
  });
});
