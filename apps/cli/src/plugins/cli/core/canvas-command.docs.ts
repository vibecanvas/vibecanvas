import { z } from 'zod';
import {
  zArrowData,
  zBaseElement,
  zDiamondData,
  zElementStyle,
  zEllipseData,
  zGroup,
  zLineData,
  zRectData,
  zTextData,
} from '@vibecanvas/service-automerge/types/canvas-doc.zod';

const CANVAS_DOC_ZOD_PATH = 'packages/service-automerge/src/types/canvas-doc.zod.ts';

type TSchemaBlock = {
  key: string;
  title: string;
  schemaName: string;
  schema: Parameters<typeof z.toJSONSchema>[0];
};

type TSchemaDocKey = 'add' | 'patch';

type TRenderSchemaArgs = {
  doc: TSchemaDocKey;
  filter?: string | boolean;
};

const SCHEMA_BLOCKS: Record<TSchemaDocKey, TSchemaBlock[]> = {
  add: [
    { key: 'base', title: 'Base element fields', schemaName: 'zBaseElement', schema: zBaseElement },
    { key: 'style', title: 'Element style fields', schemaName: 'zElementStyle', schema: zElementStyle },
    { key: 'rect', title: 'Rect data', schemaName: 'zRectData', schema: zRectData },
    { key: 'ellipse', title: 'Ellipse data', schemaName: 'zEllipseData', schema: zEllipseData },
    { key: 'diamond', title: 'Diamond data', schemaName: 'zDiamondData', schema: zDiamondData },
    { key: 'text', title: 'Text data', schemaName: 'zTextData', schema: zTextData },
    { key: 'line', title: 'Line data', schemaName: 'zLineData', schema: zLineData },
    { key: 'arrow', title: 'Arrow data', schemaName: 'zArrowData', schema: zArrowData },
  ],
  patch: [
    { key: 'base', title: 'Element patchable top-level fields come from', schemaName: 'zBaseElement', schema: zBaseElement },
    { key: 'style', title: 'Element style patch fields come from', schemaName: 'zElementStyle', schema: zElementStyle },
    { key: 'rect', title: 'Rect data patch fields come from', schemaName: 'zRectData', schema: zRectData },
    { key: 'ellipse', title: 'Ellipse data patch fields come from', schemaName: 'zEllipseData', schema: zEllipseData },
    { key: 'diamond', title: 'Diamond data patch fields come from', schemaName: 'zDiamondData', schema: zDiamondData },
    { key: 'text', title: 'Text data patch fields come from', schemaName: 'zTextData', schema: zTextData },
    { key: 'line', title: 'Line data patch fields come from', schemaName: 'zLineData', schema: zLineData },
    { key: 'arrow', title: 'Arrow data patch fields come from', schemaName: 'zArrowData', schema: zArrowData },
    { key: 'group', title: 'Group patch fields come from', schemaName: 'zGroup', schema: zGroup },
  ],
};

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
  return blocks.filter((block) => block.key === normalized || block.schemaName.toLowerCase() === normalized);
}

function renderSchemaBlock(block: TSchemaBlock): string {
  return `${block.title}
${block.schemaName}
${JSON.stringify(z.toJSONSchema(block.schema), null, 2)}`;
}

export function renderCanvasCommandSchema(args: TRenderSchemaArgs): string {
  const blocks = selectSchemaBlocks(args.doc, args.filter);
  const knownKeys = SCHEMA_BLOCKS[args.doc].map((block) => block.key).join(', ');
  const header = `Schema source:
  ${CANVAS_DOC_ZOD_PATH}`;

  if (blocks.length === 0) {
    return `${header}

No schema block matched '${String(args.filter)}'.
Known schema filters: ${knownKeys}`;
  }

  const normalizedFilter = normalizeSchemaFilter(args.filter);
  const filterLine = normalizedFilter ? `
Schema filter:
  ${normalizedFilter}` : '';
  return `${header}${filterLine}

${blocks.map(renderSchemaBlock).join('\n\n')}`;
}

export function listCanvasCommandSchemaFilters(doc: TSchemaDocKey): string {
  return SCHEMA_BLOCKS[doc].map((block) => block.key).join(' | ');
}
