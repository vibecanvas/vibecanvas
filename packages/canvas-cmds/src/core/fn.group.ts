import type { TCanvasDoc, TElement, TGroup } from '@vibecanvas/automerge-service/types/canvas-doc';
import { fnSortIds } from './fn.canvas';

export function fnCollectGroupCascade(doc: TCanvasDoc, rootGroupId: string): { groupIds: string[]; elementIds: string[] } {
  const pending = [rootGroupId];
  const visited = new Set<string>();
  const groupIds = new Set<string>();
  const elementIds = new Set<string>();

  while (pending.length > 0) {
    const currentGroupId = pending.shift();
    if (!currentGroupId || visited.has(currentGroupId)) continue;
    visited.add(currentGroupId);
    groupIds.add(currentGroupId);

    for (const element of Object.values(doc.elements)) {
      if (element.parentGroupId === currentGroupId) elementIds.add(element.id);
    }

    for (const group of Object.values(doc.groups)) {
      if (group.parentGroupId === currentGroupId) pending.push(group.id);
    }
  }

  return {
    groupIds: fnSortIds([...groupIds]),
    elementIds: fnSortIds([...elementIds]),
  };
}

export function fnCollectDirectChildIds(doc: TCanvasDoc, groupIds: readonly string[]): { releasedElementIds: string[]; reparentedGroupIds: string[] } {
  const releasedElementIds = new Set<string>();
  const reparentedGroupIds = new Set<string>();

  for (const groupId of groupIds) {
    for (const element of Object.values(doc.elements)) {
      if (element.parentGroupId === groupId) releasedElementIds.add(element.id);
    }

    for (const group of Object.values(doc.groups)) {
      if (group.parentGroupId === groupId && !groupIds.includes(group.id)) reparentedGroupIds.add(group.id);
    }
  }

  return {
    releasedElementIds: fnSortIds([...releasedElementIds]),
    reparentedGroupIds: fnSortIds([...reparentedGroupIds]),
  };
}

export function fnResolveElementsByIds(doc: TCanvasDoc, ids: string[]): TElement[] {
  return ids.map((id) => doc.elements[id]!).filter(Boolean);
}

export function fnResolveGroupsByIds(doc: TCanvasDoc, ids: string[]): TGroup[] {
  return ids.map((id) => doc.groups[id]!).filter(Boolean);
}
