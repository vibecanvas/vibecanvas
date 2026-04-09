import { readFile } from 'node:fs/promises';
import type { IAutomergeService } from '@vibecanvas/service-automerge/IAutomergeService';
import type { ICliConfig } from '@vibecanvas/cli/config';
import type { IDbService } from '@vibecanvas/service-db/IDbService';
import { txExecuteCanvasAdd, type TCanvasAddElementInput, type TCanvasAddSuccess } from '@vibecanvas/canvas-cmds/cmds/tx.cmd.add';
import { fxRenderCanvasAddContracts } from '@vibecanvas/canvas-cmds/cmds/fn.canvas-add-contract';
import { CANVAS_ADD_HELP_EXAMPLES } from '../canvas-command.examples';
import { fxDispatchCanvasCommand } from '../core/fx.dispatch-canvas-command';
import { listCanvasCommandSchemaFilters, renderCanvasCommandSchema } from '../core/canvas-command.docs';
import { fnPrintCommandError, fnPrintCommandResult } from '../core/fn.print-command-result';
import { buildCanvasAddInput } from './fn.canvas-subcommand-inputs';

function fnBuildAddHelp(args?: { schema?: boolean | string }): string {
  return `Usage: vibecanvas canvas add [options]

Add primitive elements inside one selected canvas.

Required canvas selector (choose exactly one):
  --canvas <id>             Select one canvas by exact canvas row id
  --canvas-name <query>     Select one canvas by unique case-insensitive name substring

Element source (choose exactly one):
  --element <json>          Inline one element payload (repeatable)
  --elements-file <path>    Read a JSON array of element payloads from a file
  --elements-stdin          Read a JSON array of element payloads from stdin
  --rect <x,y,w,h>          Shorthand rect element (repeatable)
  --ellipse <x,y,rx,ry>     Shorthand ellipse element (repeatable)
  --diamond <x,y,w,h>       Shorthand diamond element (repeatable)
  --text <x,y,text>         Shorthand text element (repeatable)
  --line <x,y,x2,y2>        Shorthand line element (repeatable)
  --arrow <x,y,x2,y2>       Shorthand arrow element (repeatable)

Notes on ids:
  - do not pass element ids from agents for add flows.
  - add ignores input ids and creates fresh ids server-side.

Examples:
  ${CANVAS_ADD_HELP_EXAMPLES.inlineRect}
  ${CANVAS_ADD_HELP_EXAMPLES.inlineText}
  ${CANVAS_ADD_HELP_EXAMPLES.inlineMinimalRect}
  ${CANVAS_ADD_HELP_EXAMPLES.inlineMinimalText}
  ${CANVAS_ADD_HELP_EXAMPLES.elementsFile}
  ${CANVAS_ADD_HELP_EXAMPLES.shorthandRect}
  ${CANVAS_ADD_HELP_EXAMPLES.shorthandText}

Supported types:
  rect | ellipse | diamond | text | line | arrow

${fxRenderCanvasAddContracts()}

Options:
  --db <path>               Optional explicit SQLite file override for the opened db
  --json                    Emit machine-readable success/error payloads
  --schema [type]           Print schema blocks sourced from canvas-doc.ts
                            Filters: ${listCanvasCommandSchemaFilters('add')}
  --help, -h                Show this help message

Notes:
  - add tries the local API server first when no --db flag is passed.
  - when no local API server is found, add falls back to direct command execution.
  - each payload must be a JSON object with at least a supported type.
  - --schema with no type prints all add schema blocks.
  - file/stdin sources must be a JSON array of element payload objects.
  - shorthand flags must use exact comma counts with no empty numeric segments.
  - --text shorthand must be exactly x,y,text.
  - shorthand flags can be mixed with each other, but not with --element/--elements-file/--elements-stdin.${args?.schema ? `

${renderCanvasCommandSchema({ doc: 'add', filter: args.schema })}` : ''}
`;
}

export function printCanvasAddHelp(args?: { schema?: boolean | string }): void {
  console.log(fnBuildAddHelp(args));
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

function fnStripInputId(element: TCanvasAddElementInput): TCanvasAddElementInput {
  const { id: _ignoredId, ...rest } = element;
  return rest;
}

function parseAddElement(raw: string, options: ICliConfig['subcommandOptions']): TCanvasAddElementInput {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error('Element payload must be a JSON object.');
    }
    return fnStripInputId(parsed as TCanvasAddElementInput);
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
    return parsed.map((entry) => fnStripInputId(entry as TCanvasAddElementInput));
  } catch {
    throw buildAddSourceError(options, 'CANVAS_ADD_PAYLOAD_INVALID', 'Element payload source must be valid JSON. Use repeated --element objects or one JSON array from file/stdin.');
  }
}

function parseCommaNumbers(raw: string, expected: number, options: ICliConfig['subcommandOptions'], label: string): number[] {
  const parts = raw.split(',');
  if (parts.length !== expected || parts.some((part) => part.trim().length === 0)) {
    throw buildAddSourceError(options, 'CANVAS_ADD_SHORTHAND_INVALID', `${label} shorthand must be exactly ${expected} comma-separated numbers with no empty segments.`);
  }

  const numeric = parts.map((part) => Number(part.trim()));
  if (numeric.some((part) => !Number.isFinite(part))) {
    throw buildAddSourceError(options, 'CANVAS_ADD_SHORTHAND_INVALID', `${label} shorthand must be exactly ${expected} comma-separated numbers with no empty segments.`);
  }
  return numeric;
}

function parseRectShorthands(values: string[], options: ICliConfig['subcommandOptions']): TCanvasAddElementInput[] {
  return values.map((value) => {
    const [x, y, w, h] = parseCommaNumbers(value, 4, options, '--rect');
    return { type: 'rect', x, y, data: { w, h } };
  });
}

function parseEllipseShorthands(values: string[], options: ICliConfig['subcommandOptions']): TCanvasAddElementInput[] {
  return values.map((value) => {
    const [x, y, rx, ry] = parseCommaNumbers(value, 4, options, '--ellipse');
    return { type: 'ellipse', x, y, data: { rx, ry } };
  });
}

function parseDiamondShorthands(values: string[], options: ICliConfig['subcommandOptions']): TCanvasAddElementInput[] {
  return values.map((value) => {
    const [x, y, w, h] = parseCommaNumbers(value, 4, options, '--diamond');
    return { type: 'diamond', x, y, data: { w, h } };
  });
}

function parseTextShorthands(values: string[], options: ICliConfig['subcommandOptions']): TCanvasAddElementInput[] {
  return values.map((value) => {
    const firstComma = value.indexOf(',');
    const secondComma = firstComma < 0 ? -1 : value.indexOf(',', firstComma + 1);
    if (firstComma < 0 || secondComma < 0) {
      throw buildAddSourceError(options, 'CANVAS_ADD_SHORTHAND_INVALID', '--text shorthand must be x,y,text.');
    }
    const x = Number(value.slice(0, firstComma).trim());
    const y = Number(value.slice(firstComma + 1, secondComma).trim());
    const text = value.slice(secondComma + 1);
    if (!Number.isFinite(x) || !Number.isFinite(y) || text.trim().length === 0 || text.includes('\n')) {
      throw buildAddSourceError(options, 'CANVAS_ADD_SHORTHAND_INVALID', '--text shorthand must be exactly x,y,text with non-empty single-line text.');
    }
    return { type: 'text', x, y, data: { text, originalText: text } };
  });
}

function parseLineLikeShorthands(values: string[], options: ICliConfig['subcommandOptions'], type: 'line' | 'arrow'): TCanvasAddElementInput[] {
  return values.map((value) => {
    const [x, y, x2, y2] = parseCommaNumbers(value, 4, options, `--${type}`);
    return { type, x, y, data: { points: [[0, 0], [x2 - x, y2 - y]] } };
  });
}

function readShorthandElements(options: ICliConfig['subcommandOptions']): TCanvasAddElementInput[] {
  return [
    ...parseRectShorthands(options?.rects ?? [], options),
    ...parseEllipseShorthands(options?.ellipses ?? [], options),
    ...parseDiamondShorthands(options?.diamonds ?? [], options),
    ...parseTextShorthands(options?.texts ?? [], options),
    ...parseLineLikeShorthands(options?.lines ?? [], options, 'line'),
    ...parseLineLikeShorthands(options?.arrows ?? [], options, 'arrow'),
  ];
}

async function readAddElements(config: ICliConfig): Promise<TCanvasAddElementInput[]> {
  const options = config.subcommandOptions;
  const shorthandElements = readShorthandElements(options);
  const sourceCount = Number((options?.elementJsons?.length ?? 0) > 0) + Number(Boolean(options?.elementsFile)) + Number(Boolean(options?.elementsStdin)) + Number(shorthandElements.length > 0);

  if (sourceCount === 0) {
    throw buildAddSourceError(options, 'CANVAS_ADD_SOURCE_REQUIRED', 'Add requires exactly one element source: --element, --elements-file, --elements-stdin, or shorthand flags.');
  }

  if (sourceCount > 1) {
    throw buildAddSourceError(options, 'CANVAS_ADD_SOURCE_CONFLICT', 'Add accepts exactly one element source: --element, --elements-file, --elements-stdin, or shorthand flags.');
  }

  if (shorthandElements.length > 0) return shorthandElements;

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
      local: async () => {
        const result = await txExecuteCanvasAdd({ dbService: services.db, automergeService: services.automerge, crypto }, input);
        await Bun.sleep(75);
        return result;
      },
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
