import { readFile } from 'node:fs/promises';
import type { IAutomergeService } from '@vibecanvas/service-automerge/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/service-db/IDbService';
import { txExecuteCanvasAdd, type TCanvasAddElementInput, type TCanvasAddSuccess } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.add';
import { fxDispatchCanvasCommand } from '../core/fx.dispatch-canvas-command';
import { fnPrintCommandError, fnPrintCommandResult } from '../core/fn.print-command-result';
import { buildCanvasAddInput } from './fn.canvas-subcommand-inputs';

export function printCanvasAddHelp(): void {
  console.log(`Usage: vibecanvas canvas add [options]

Add primitive elements inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Element source (choose exactly one):
  --element <json>          Inline one element payload (repeatable)
  --elements-file <path>    Read a JSON array of element payloads from a file
  --elements-stdin          Read a JSON array of element payloads from stdin

Element payload shape:
  {"type":"rect"}
  {"type":"text","x":40,"y":20,"data":{"text":"hello","originalText":"hello"}}
  {"id":"line-1","type":"line","parentGroupId":"group-1","data":{"points":[[0,0],[120,0]]}}

Supported types:
  rect | ellipse | diamond | text | line | arrow

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --help, -h                Show this help message

Notes:
  - add tries the local API server first when no --db flag is passed.
  - when no local API server is found, add falls back to direct command execution.
  - each payload must be a JSON object with at least a supported type.
  - file/stdin sources must be a JSON array of element payload objects.
`)
}

function buildAddSourceError(options: ICliConfig['subcommandOptions'], code: string, message: string) {
  return {
    ok: false,
    command: 'canvas.add',
    code,
    message,
    canvasId: options?.canvasId ?? null,
    canvasNameQuery: options?.canvasNameQuery ?? null,
  };
}

function parseAddElement(raw: string, options: ICliConfig['subcommandOptions']): TCanvasAddElementInput {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error('Element payload must be a JSON object.');
    }
    return parsed as TCanvasAddElementInput;
  } catch {
    throw buildAddSourceError(options, 'CANVAS_ADD_PAYLOAD_INVALID', 'Element payload must be valid JSON object input.');
  }
}

function parseAddElements(raw: string, options: ICliConfig['subcommandOptions']): TCanvasAddElementInput[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('Element payload collection must be a JSON array.');
    }
    if (!parsed.every((entry) => entry && !Array.isArray(entry) && typeof entry === 'object')) {
      throw new Error('Every element payload must be a JSON object.');
    }
    return parsed as TCanvasAddElementInput[];
  } catch {
    throw buildAddSourceError(options, 'CANVAS_ADD_PAYLOAD_INVALID', 'Element payload source must be valid JSON. Use repeated --element objects or one JSON array from file/stdin.');
  }
}

async function readAddElements(config: ICliConfig): Promise<TCanvasAddElementInput[]> {
  const options = config.subcommandOptions;
  const sourceCount = Number((options?.elementJsons?.length ?? 0) > 0) + Number(Boolean(options?.elementsFile)) + Number(Boolean(options?.elementsStdin));

  if (sourceCount === 0) {
    throw buildAddSourceError(options, 'CANVAS_ADD_SOURCE_REQUIRED', 'Add requires exactly one element source: --element, --elements-file, or --elements-stdin.');
  }

  if (sourceCount > 1) {
    throw buildAddSourceError(options, 'CANVAS_ADD_SOURCE_CONFLICT', 'Add accepts exactly one element source: --element, --elements-file, or --elements-stdin.');
  }

  if ((options?.elementJsons?.length ?? 0) > 0) {
    return options!.elementJsons!.map((entry) => parseAddElement(entry, options));
  }

  if (options?.elementsFile) {
    return parseAddElements(await readFile(options.elementsFile, 'utf8'), options);
  }

  return parseAddElements(await new Response(Bun.stdin.stream()).text(), options);
}

function printCanvasAddText(result: TCanvasAddSuccess): void {
  process.stdout.write(`Added ${result.addedCount} element${result.addedCount === 1 ? '' : 's'} to canvas=${result.canvas.id} name=${JSON.stringify(result.canvas.name)}\n`);
  for (const element of result.elements) {
    process.stdout.write(`- id=${element.id} type=${element.type} parent=${element.parentGroupId ?? 'null'} zIndex=${element.zIndex}\n`);
  }
  process.exitCode = 0;
}

export async function runCanvasAddCommand(services: { db: IDbService, automerge: IAutomergeService }, config: ICliConfig) {
  const wantsJson = config.subcommandOptions?.json === true;

  try {
    const elements = await readAddElements(config);
    const input = buildCanvasAddInput(config.subcommandOptions, elements);

    const result = await fxDispatchCanvasCommand(services, config, {
      client: async (safeClient) => {
        const [error, response] = await safeClient.add(input);
        if (error) throw error;
        return response as TCanvasAddSuccess;
      },
      local: async () => txExecuteCanvasAdd({ dbService: services.db, automergeService: services.automerge }, input),
    });

    if (wantsJson) {
      fnPrintCommandResult(result, true);
      return;
    }

    printCanvasAddText(result);
  } catch (error) {
    fnPrintCommandError(error, wantsJson);
  }
}
