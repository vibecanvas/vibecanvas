import { readFile } from 'node:fs/promises';
import type { IAutomergeService } from '@vibecanvas/automerge-service/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/db/IDbService';
import { txExecuteCanvasPatch, type TCanvasPatchEnvelope } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.patch';
import type { TSafeCanvasCmdClient } from '../core/fn.build-rpc-link';
import { fnPrintCommandError, fnPrintCommandResult } from '../core/fn.print-command-result';
import { buildCanvasPatchInput } from './fn.canvas-subcommand-inputs';

async function readPatchEnvelope(config: ICliConfig): Promise<TCanvasPatchEnvelope | undefined> {
  const options = config.subcommandOptions;

  if (options?.patch) {
    try {
      return JSON.parse(options.patch) as TCanvasPatchEnvelope;
    } catch {
      throw {
        ok: false,
        command: 'canvas.patch',
        code: 'CANVAS_PATCH_PAYLOAD_INVALID',
        message: 'Patch payload must be valid JSON.',
        canvasId: options?.canvasId ?? null,
        canvasNameQuery: options?.canvasNameQuery ?? null,
      };
    }
  }

  if (options?.patchFile) {
    try {
      return JSON.parse(await readFile(options.patchFile, 'utf8')) as TCanvasPatchEnvelope;
    } catch {
      throw {
        ok: false,
        command: 'canvas.patch',
        code: 'CANVAS_PATCH_PAYLOAD_INVALID',
        message: 'Patch payload must be valid JSON.',
        canvasId: options?.canvasId ?? null,
        canvasNameQuery: options?.canvasNameQuery ?? null,
      };
    }
  }

  if (options?.patchStdin) {
    const stdinText = await new Response(Bun.stdin.stream()).text();
    try {
      return JSON.parse(stdinText) as TCanvasPatchEnvelope;
    } catch {
      throw {
        ok: false,
        command: 'canvas.patch',
        code: 'CANVAS_PATCH_PAYLOAD_INVALID',
        message: 'Patch payload must be valid JSON.',
        canvasId: options?.canvasId ?? null,
        canvasNameQuery: options?.canvasNameQuery ?? null,
      };
    }
  }

  return undefined;
}

export async function runCanvasPatchCommand(services: { db: IDbService, automerge: IAutomergeService, safeClient: TSafeCanvasCmdClient | null }, config: ICliConfig) {
  const wantsJson = config.subcommandOptions?.json === true;

  try {
    const patch = await readPatchEnvelope(config);
    const input = buildCanvasPatchInput(config.subcommandOptions, patch);

    if (services.safeClient) {
      const [error, result] = await services.safeClient.patch(input);
      if (error) {
        fnPrintCommandError(error, wantsJson);
        return;
      }
      fnPrintCommandResult(result, wantsJson);
      return;
    }

    const result = await txExecuteCanvasPatch({ dbService: services.db, automergeService: services.automerge }, input);
    fnPrintCommandResult(result, wantsJson);
  } catch (error) {
    fnPrintCommandError(error, wantsJson);
  }
}
