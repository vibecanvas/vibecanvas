export type {
  TCanvasCmdContext,
  TCanvasDocHandle,
  TCanvasRow,
  TCanvasSelector,
  TCanvasSummary,
  TWaitForCanvasMutationArgs,
} from './context';
export { normalizeCanvas } from './context';

export type { TCanvasCmdErrorDetails } from './errors';
export { CanvasCmdError, isCanvasCmdError, throwCanvasCmdError, toCanvasCmdError } from './errors';

export type { TCanvasInventoryEntry, TCanvasListSuccess } from './cmd.list';
export { executeCanvasList } from './cmd.list';

export type { TCanvasMoveInput, TCanvasMoveSuccess, TMoveMode } from './cmd.move';
export { executeCanvasMove } from './cmd.move';

export type { TCanvasQueryInput, TCanvasQuerySuccess, TQueryMatch } from './cmd.query';
export { executeCanvasQuery } from './cmd.query';

export {
  formatCanvasInventoryEntry,
  renderCanvasListText,
  renderCanvasMoveText,
  renderCanvasQueryText,
} from './formatters';

export type {
  TSceneBounds,
  TSceneMatchMetadata,
  TSceneOutputMode,
  TSceneTarget,
} from './scene-shared';
export {
  SCENE_OUTPUT_MODES,
  buildElementPayload,
  buildGroupPayload,
  buildGroupRelations,
  buildMatchMetadata,
  buildTargetPayload,
  getElementBounds,
  getGroupAncestry,
  getGroupBounds,
  getTargetBounds,
  isGroupInSubtree,
  resolveCanvasSelection,
  resolveOutputMode,
  sortIds,
  sortSceneTargets,
  toIsoString,
} from './scene-shared';

export type {
  TSceneSelector,
  TSceneSelectorEnvelope,
  TSceneSelectorScalar,
  TSceneSelectorSource,
  TSceneStyleFilter,
} from './scene-query-shared';
export {
  createEmptySelector,
  createSceneTargets,
  matchesSceneSelector,
  normalizeStringList,
  resolveSelectorEnvelope,
  validateGroupSelector,
} from './scene-query-shared';
