import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const CANVAS_DOC_TYPES_PATH = resolve(CURRENT_DIR, '../../../../../../packages/service-automerge/src/types/canvas-doc.ts');

type TSchemaBlock = {
  key: string;
  title: string;
  typeName: string;
};

type TSchemaDocKey = 'add' | 'patch';

type TRenderSchemaArgs = {
  doc: TSchemaDocKey;
  filter?: string | boolean;
};

const SCHEMA_BLOCKS: Record<TSchemaDocKey, TSchemaBlock[]> = {
  add: [
    { key: 'base', title: 'Base element fields', typeName: 'TBaseElement' },
    { key: 'style', title: 'Element style fields', typeName: 'TElementStyle' },
    { key: 'rect', title: 'Rect data', typeName: 'TRectData' },
    { key: 'ellipse', title: 'Ellipse data', typeName: 'TEllipseData' },
    { key: 'diamond', title: 'Diamond data', typeName: 'TDiamondData' },
    { key: 'text', title: 'Text data', typeName: 'TTextData' },
    { key: 'line', title: 'Line data', typeName: 'TLineData' },
    { key: 'arrow', title: 'Arrow data', typeName: 'TArrowData' },
  ],
  patch: [
    { key: 'base', title: 'Element patchable top-level fields come from', typeName: 'TBaseElement' },
    { key: 'style', title: 'Element style patch fields come from', typeName: 'TElementStyle' },
    { key: 'rect', title: 'Rect data patch fields come from', typeName: 'TRectData' },
    { key: 'ellipse', title: 'Ellipse data patch fields come from', typeName: 'TEllipseData' },
    { key: 'diamond', title: 'Diamond data patch fields come from', typeName: 'TDiamondData' },
    { key: 'text', title: 'Text data patch fields come from', typeName: 'TTextData' },
    { key: 'line', title: 'Line data patch fields come from', typeName: 'TLineData' },
    { key: 'arrow', title: 'Arrow data patch fields come from', typeName: 'TArrowData' },
    { key: 'group', title: 'Group patch fields come from', typeName: 'TGroup' },
  ],
};

function readCanvasDocTypesSource(): string {
  return readFileSync(CANVAS_DOC_TYPES_PATH, 'utf8');
}

function extractExportTypeBlock(source: string, typeName: string): string {
  const marker = `export type ${typeName} =`;
  const start = source.indexOf(marker);
  if (start < 0) return `// Missing schema block: ${typeName}`;

  const braceStart = source.indexOf('{', start);
  if (braceStart < 0) return `// Missing schema block: ${typeName}`;

  let depth = 0;
  let end = braceStart;
  for (; end < source.length; end += 1) {
    const char = source[end]!;
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        end += 1;
        break;
      }
    }
  }

  while (end < source.length && /[\s;]/.test(source[end]!)) end += 1;
  return source.slice(start, end).trim();
}

function normalizeSchemaFilter(filter: string | boolean | undefined): string | null {
  if (filter === undefined || filter === false) return null;
  if (filter === true) return null;
  const normalized = filter.trim().toLowerCase();
  if (!normalized || normalized === 'all' || normalized === '*') return null;
  return normalized;
}

function selectSchemaBlocks(doc: TSchemaDocKey, filter: string | boolean | undefined): TSchemaBlock[] {
  const normalized = normalizeSchemaFilter(filter);
  const blocks = SCHEMA_BLOCKS[doc];
  if (!normalized) return blocks;
  return blocks.filter((block) => block.key === normalized || block.typeName.toLowerCase() === normalized.toLowerCase());
}

export function renderCanvasCommandSchema(args: TRenderSchemaArgs): string {
  const blocks = selectSchemaBlocks(args.doc, args.filter);
  const source = readCanvasDocTypesSource();
  const knownKeys = SCHEMA_BLOCKS[args.doc].map((block) => block.key).join(', ');
  const header = `Schema source:\n  ${CANVAS_DOC_TYPES_PATH}`;

  if (blocks.length === 0) {
    return `${header}\n\nNo schema block matched '${String(args.filter)}'.\nKnown schema filters: ${knownKeys}`;
  }

  const filterLine = normalizeSchemaFilter(args.filter) ? `\nSchema filter:\n  ${normalizeSchemaFilter(args.filter)}` : '';
  return `${header}${filterLine}\n\n${blocks.map((block) => `${block.title}\n${extractExportTypeBlock(source, block.typeName)}`).join('\n\n')}`;
}

export function listCanvasCommandSchemaFilters(doc: TSchemaDocKey): string {
  return SCHEMA_BLOCKS[doc].map((block) => block.key).join(' | ');
}
