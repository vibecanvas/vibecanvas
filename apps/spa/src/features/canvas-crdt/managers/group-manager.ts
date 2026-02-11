import type { DocHandle } from "@automerge/automerge-repo"
import type { TCanvasDoc, TGroup } from "@vibecanvas/shell"
import type { Canvas, TGroupMember } from "../canvas/canvas"
import { VirtualGroup } from "../renderables/virtual-group.class"
import { Patch } from "@automerge/automerge"
import { AElement } from "../renderables/element.abstract"
import { TChanges, TChange, Change } from "../types"

/**
 * GroupManager handles the lifecycle of VirtualGroup instances.
 *
 * Responsibilities:
 * - Create VirtualGroups from CRDT groups
 * - Group/ungroup operations
 * - Find group for element (including outermost group)
 * - Sync VirtualGroups with CRDT changes
 * 
 */
export class GroupManager {
  public groups: Map<string, VirtualGroup> = new Map()

  constructor(
    private readonly canvas: Canvas,
    private readonly handle: DocHandle<TCanvasDoc>,
  ) {}

  /**
   * Initialize VirtualGroups from document groups.
   * Called once when canvas loads.
   */
  public initializeFromDoc(): void {
    const doc = this.handle.doc()
    if (!doc?.groups) return

    for (const group of Object.values(doc.groups)) {
      this.createVirtualGroup(group)
    }
  }

  /**
   * Create a VirtualGroup for a TGroup.
   */
  private createVirtualGroup(group: TGroup): VirtualGroup {
    const virtualGroup = new VirtualGroup(group, this.canvas)
    this.canvas.addGroup(virtualGroup)
    return virtualGroup
  }

  /**
   * Group selected elements.
   * Updates local PixiJS state and returns CRDT changes for commands to persist.
   * @param members - TGroupMembers to group
   * @param name - Optional group name
   * @returns Object with new group ID and CRDT changes, or null if grouping failed
   */
  public group(members: TGroupMember[], name?: string): {newGroupId: string, changes: TChanges} | null {
    if (members.length < 2) return null

    const groupId = crypto.randomUUID()
    const groupName = name ?? `Group ${this.groups.size + 1}`
    const now = Date.now()

    // Create TGroup locally (not in CRDT yet)
    const newGroup: TGroup = {
      id: groupId,
      name: groupName,
      color: null,
      parentGroupId: null,
      locked: false,
      createdAt: now,
    }

    // Create VirtualGroup from local TGroup
    this.createVirtualGroup(newGroup)

    // Build CRDT changes
    const changes: TChange[] = [
      Change.insert(['groups', groupId], newGroup),
    ]

    // Update members locally and collect CRDT changes
    for (const member of members) {
      if (member instanceof AElement) {
        member.element.parentGroupId = groupId
        changes.push(
          Change.crdt(['elements', member.id, 'parentGroupId'], groupId),
          Change.crdt(['elements', member.id, 'updatedAt'], now),
        )
      } else {
        member.group.parentGroupId = groupId
        changes.push(
          Change.crdt(['groups', member.id, 'parentGroupId'], groupId),
        )
      }
    }

    return {
      newGroupId: groupId,
      changes: {
        action: { type: 'group', groupId, memberIds: members.map(m => m.id) },
        targetId: groupId,
        changes,
        timestamp: now,
      },
    }
  }

  /**
   * Ungroup a group, removing the group and clearing groupId from members.
   * Updates local PixiJS state and returns CRDT changes for commands to persist.
   * @param groupId - ID of the group to ungroup
   * @returns Object with removed group ID, member IDs, and CRDT changes, or null if group not found
   */
  public ungroup(groupId: string): {removedGroupId: string, memberIds: string[], changes: TChanges} | null {
    const virtualGroup = this.groups.get(groupId)
    if (!virtualGroup) return null

    const memberIds = virtualGroup.members.map(m => m.id)
    const now = Date.now()

    // Build CRDT changes
    const changes: TChange[] = []

    // Clear groupId from members locally and collect CRDT changes
    for (const member of virtualGroup.members) {
      if (member instanceof AElement) {
        member.element.parentGroupId = null
        changes.push(
          Change.crdt(['elements', member.id, 'parentGroupId'], null),
          Change.crdt(['elements', member.id, 'updatedAt'], now),
        )
      } else {
        member.group.parentGroupId = null
        changes.push(
          Change.crdt(['groups', member.id, 'parentGroupId'], null),
        )
      }
    }

    // Delete the group
    changes.push(Change.delete(['groups', groupId]))

    // Cleanup VirtualGroup
    this.canvas.removeGroup(groupId)

    return {
      removedGroupId: groupId,
      memberIds,
      changes: {
        action: { type: 'ungroup', groupId },
        targetId: groupId,
        changes,
        timestamp: now,
      },
    }
  }

  /**
   * Get the VirtualGroup for an element (if it belongs to one).
   */
  public getGroupForElement(elementId: string): VirtualGroup | null {
    const element = this.canvas.elements.get(elementId)
    if (!element?.element.parentGroupId) return null

    return this.groups.get(element.element.parentGroupId) ?? null
  }

  /**
   * Find the outermost group for a given groupId.
   * Traverses the parentGroupId chain to find the root group.
   */
  public findOutermostGroup(groupId: string): VirtualGroup | null {
    let currentGroup = this.groups.get(groupId)
    if (!currentGroup) return null

    // Walk up the parent chain
    while (currentGroup.group.parentGroupId) {
      const parentGroup = this.groups.get(currentGroup.group.parentGroupId)
      if (!parentGroup) break
      currentGroup = parentGroup
    }

    return currentGroup
  }

  /**
   * Get the VirtualGroup for a selectable, finding the outermost group.
   * This is what should be selected when clicking on a grouped element.
   */
  public getOutermostGroupForSelectable(selectedId: string): VirtualGroup | null {
    const virtualGroup = this.groups.get(selectedId)
    if (virtualGroup) return virtualGroup
    const element = this.canvas.elements.get(selectedId)
    if (!element?.element.parentGroupId) return null

    return this.findOutermostGroup(element.element.parentGroupId)
  }

  /**
   * Find all direct members of a group.
   * Members can be elements (groupId === groupId) or nested groups (parentGroupId === groupId).
   * @param groupId - ID of the group to find members for
   * @returns Array of direct members (elements and nested groups)
   */
  public findMembersForGroup(groupId: string): TGroupMember[] {
    const members: TGroupMember[] = []

    // Find direct element children (element.parentGroupId === groupId)
    for (const [, element] of this.canvas.elements) {
      if (element.element.parentGroupId === groupId) {
        members.push(element)
      }
    }

    // Find nested group children (group.parentGroupId === groupId)
    for (const [, group] of this.groups) {
      if (group.group.parentGroupId === groupId) {
        members.push(group)
      }
    }

    return members
  }

  /**
   * Handle CRDT patches for groups.
   * Called when document changes (local or remote).
   */
  public applyPatches(patches: Patch[]): void {
    for (const patch of patches) {
      const path = patch.path as (string | number)[]
      if (path[0] !== 'groups') continue

      const groupId = path[1] as string

      if (patch.action === 'del' && path.length === 2) {
        // Group deleted
        const virtualGroup = this.groups.get(groupId)
        if (virtualGroup) {
          virtualGroup.destroy()
          this.groups.delete(groupId)
        }
      } else if (patch.action === 'put' && path.length === 2) {
        // Group created
        const doc = this.handle.doc()
        const group = doc?.groups[groupId]
        if (group && !this.groups.has(groupId)) {
          this.createVirtualGroup(group)
        }
      }
    }

    // Also handle element groupId changes
    for (const patch of patches) {
      const path = patch.path as (string | number)[]
      if (path[0] === 'elements' && path[2] === 'parentGroupId') {
        // Element's groupId changed - invalidate affected groups
        // For 'put', the new groupId is in patch.value
        // For 'del', the groupId was cleared (we can't know the old value from the patch)
        if (patch.action === 'put' && 'value' in patch) {
          const newGroupId = typeof patch.value === 'string' ? patch.value : null
          if (newGroupId && this.groups.has(newGroupId)) {
            this.groups.get(newGroupId)!.invalidateMembers()
          }
        }
        // For any groupId change, also invalidate based on current element state
        // This handles the case where we can't determine the old group from the patch
        const elementId = path[1] as string
        const element = this.canvas.elements.get(elementId)
        if (element?.element.parentGroupId) {
          const groupId = element.element.parentGroupId
          if (this.groups.has(groupId)) {
            this.groups.get(groupId)!.invalidateMembers()
          }
        }
      }
    }
  }

  /**
   * Invalidate all group members (call after elements are added/removed).
   */
  public invalidateAllMembers(): void {
    for (const group of this.groups.values()) {
      group.invalidateMembers()
    }
  }

  /**
   * Clean up all VirtualGroups.
   */
  public destroy(): void {
    for (const group of this.groups.values()) {
      group.destroy()
    }
    this.groups.clear()
  }
}
