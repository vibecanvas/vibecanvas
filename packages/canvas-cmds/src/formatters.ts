import type { TCanvasListSuccess } from './cmd.list';
import type { TCanvasMoveSuccess } from './cmd.move';
import type { TCanvasQuerySuccess } from './cmd.query';
import type { TSceneBounds } from './scene-shared';

export function formatCanvasInventoryEntry(entry: TCanvasListSuccess['canvases'][number]): string {
  return `- id=${entry.id} name=${JSON.stringify(entry.name)} createdAt=${entry.createdAt} automergeUrl=${entry.automergeUrl}`;
}

export function renderCanvasListText(result: TCanvasListSuccess): string {
  if (result.canvases.length === 0) {
    return `Canvas inventory: 0 canvases in ${result.dbPath}\n`;
  }

  const lines = [`Canvas inventory: ${result.canvases.length} canvases in ${result.dbPath}`];
  for (const canvas of result.canvases) {
    lines.push(formatCanvasInventoryEntry(canvas));
  }
  return `${lines.join('\n')}\n`;
}

function formatBounds(bounds: TSceneBounds | null): string {
  if (!bounds) return 'null';
  return `(${bounds.x}, ${bounds.y}, ${bounds.w}, ${bounds.h})`;
}

export function renderCanvasQueryText(result: TCanvasQuerySuccess): string {
  if (result.mode !== 'summary') return `${JSON.stringify(result, null, 2)}\n`;
  const label = result.count === 1 ? 'target' : 'targets';
  const lines = [`Query matched ${result.count} ${label} in canvas=${result.canvas.id} name=${JSON.stringify(result.canvas.name)} mode=${result.mode}`];
  for (const match of result.matches) {
    const suffixParts = [
      Object.prototype.hasOwnProperty.call(match.payload, 'data') ? `data=${JSON.stringify((match.payload as { data?: unknown }).data ?? null)}` : null,
      Object.prototype.hasOwnProperty.call(match.payload, 'style') ? `style=${JSON.stringify((match.payload as { style?: unknown }).style ?? null)}` : null,
    ].filter((value): value is string => Boolean(value));
    const suffix = suffixParts.length > 0 ? ` ${suffixParts.join(' ')}` : '';
    if (match.metadata.kind === 'element') {
      lines.push(`- element ${match.metadata.id} [${match.metadata.type}] parent=${match.metadata.parentGroupId ?? 'null'} bounds=${formatBounds(match.metadata.bounds)} z=${match.metadata.zIndex} locked=${String(match.metadata.locked)}${suffix}`);
      continue;
    }

    lines.push(`- group ${match.metadata.id} parent=${match.metadata.parentGroupId ?? 'null'} bounds=${formatBounds(match.metadata.bounds)} z=${match.metadata.zIndex} locked=${String(match.metadata.locked)}${suffix}`);
  }
  return `${lines.join('\n')}\n`;
}

export function renderCanvasMoveText(result: TCanvasMoveSuccess): string {
  const changedLabel = result.changedCount === 1 ? 'element' : 'elements';
  const matchedLabel = result.matchedCount === 1 ? 'target' : 'targets';
  return `Moved ${result.changedCount} ${changedLabel} from ${result.matchedCount} matched ${matchedLabel} in canvas=${result.canvas.id} name=${JSON.stringify(result.canvas.name)} mode=${result.mode} x=${result.input.x} y=${result.input.y} delta=${JSON.stringify(result.delta)} changedIds=${JSON.stringify(result.changedIds)}\n`;
}
