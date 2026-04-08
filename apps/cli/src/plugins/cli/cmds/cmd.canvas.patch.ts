import { readFile } from 'node:fs/promises';
import type { IAutomergeService } from '@vibecanvas/service-automerge/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/service-db/IDbService';
import { txExecuteCanvasPatch, type TCanvasPatchEnvelope } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.patch';
import type { TSafeCanvasCmdClient } from '../core/fn.build-rpc-link';
import { fnPrintCommandError, fnPrintCommandResult } from '../core/fn.print-command-result';
import { buildCanvasPatchInput } from './fn.canvas-subcommand-inputs';

function buildPatchSourceError(options: ICliConfig['subcommandOptions'], code: string, message: string) {
  return {
    ok: false,
    command: 'canvas.patch',
    code,
    message,
    canvasId: options?.canvasId ?? null,
    canvasNameQuery: options?.canvasNameQuery ?? null,
  };
}

async function readPatchEnvelope(config: ICliConfig): Promise<TCanvasPatchEnvelope> {
  const options = config.subcommandOptions;
  const sourceCount = Number(Boolean(options?.patch)) + Number(Boolean(options?.patchFile)) + Number(Boolean(options?.patchStdin));

  if (sourceCount === 0) {
    throw buildPatchSourceError(options, 'CANVAS_PATCH_SOURCE_REQUIRED', 'Patch requires exactly one patch source: --patch, --patch-file, or --patch-stdin.');
  }

  if (sourceCount > 1) {
    throw buildPatchSourceError(options, 'CANVAS_PATCH_SOURCE_CONFLICT', 'Patch accepts exactly one patch source: --patch, --patch-file, or --patch-stdin.');
  }

  if (options?.patch) {
    try {
      return JSON.parse(options.patch) as TCanvasPatchEnvelope;
    } catch {
      throw buildPatchSourceError(options, 'CANVAS_PATCH_PAYLOAD_INVALID', 'Patch payload must be valid JSON.');
    }
  }

  if (options?.patchFile) {
    try {
      return JSON.parse(await readFile(options.patchFile, 'utf8')) as TCanvasPatchEnvelope;
    } catch {
      throw buildPatchSourceError(options, 'CANVAS_PATCH_PAYLOAD_INVALID', 'Patch payload must be valid JSON.');
    }
  }

  const stdinText = await new Response(Bun.stdin.stream()).text();
  try {
    return JSON.parse(stdinText) as TCanvasPatchEnvelope;
  } catch {
    throw buildPatchSourceError(options, 'CANVAS_PATCH_PAYLOAD_INVALID', 'Patch payload must be valid JSON.');
  }
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
