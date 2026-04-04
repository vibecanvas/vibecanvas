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

export type {
  TCanvasDeleteInput,
  TCanvasDeleteSkippedEffect,
  TCanvasDeleteSuccess,
  TDeleteEffectsMode,
} from './cmd.delete';
export { executeCanvasDelete } from './cmd.delete';

export type {
  TCanvasElementPatch,
  TCanvasGroupPatch,
  TCanvasPatchEnvelope,
  TCanvasPatchInput,
  TCanvasPatchSuccess,
} from './cmd.patch';
export { executeCanvasPatch } from './cmd.patch';

export type { TCanvasQueryInput, TCanvasQuerySuccess, TQueryMatch } from './cmd.query';
export { executeCanvasQuery } from './cmd.query';

export type {
  TCanvasReorderInput,
  TCanvasReorderSuccess,
  TReorderAction,
  TReorderOrderEntry,
} from './cmd.reorder';
export { REORDER_ACTIONS, executeCanvasReorder } from './cmd.reorder';

export {
  formatCanvasInventoryEntry,
  renderCanvasDeleteText,
  renderCanvasListText,
  renderCanvasMoveText,
  renderCanvasPatchText,
  renderCanvasQueryText,
  renderCanvasReorderText,
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
