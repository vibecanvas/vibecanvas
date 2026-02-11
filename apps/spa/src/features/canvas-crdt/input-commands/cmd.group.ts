import { setStore, store } from "@/store"
import type { InputCommand } from "./types"
import { applyChangesToCRDT } from "../changes/apply"
import type { TGroupMember } from "../canvas/canvas"

const logOn = false
/**
 * Handle group/ungroup via keyboard shortcuts (keydown)
 * - Cmd/Ctrl + G: Group selected elements
 * - Cmd/Ctrl + Shift + G: Ungroup selected group
 */
export const cmdGroup: InputCommand = (ctx) => {
  if (ctx.eventType !== 'keydown') return false

  return handleKeyDown(ctx)
}

function handleKeyDown(ctx: Parameters<InputCommand>[0]): boolean {
  const e = ctx.event as KeyboardEvent

  // Ignore if typing in input/textarea
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return false
  }

  // Only handle Cmd/Ctrl + G (with optional Shift)
  if (!ctx.modifiers.meta && !ctx.modifiers.ctrl) return false
  if (e.key.toLowerCase() !== 'g') return false

  e.preventDefault()

  const canvas = ctx.canvas
  const selectedIds = store.canvasSlice.selectedIds

  if (ctx.modifiers.shift) {
    // Cmd/Ctrl + Shift + G = Ungroup
    return handleUngroup(canvas, selectedIds)
  } else {
    // Cmd/Ctrl + G = Group
    return handleGroup(canvas, selectedIds)
  }
}

function handleGroup(canvas: Parameters<InputCommand>[0]['canvas'], selectedIds: string[]): boolean {
  // Need at least 2 elements to group
  if (selectedIds.length < 2) {
    if (logOn) console.log('[cmdGroup] Need at least 2 elements to group')
    return true // Still consume the event
  }

  // Resolve selectedIds to TGroupMember[] (elements or groups)
  const members: TGroupMember[] = []
  const selected = canvas.mapMembers(selectedIds)
  for (const member of selected) {
    if (member.parentGroupId !== null) {
      if (logOn) console.log('[cmdGroup] Cannot group: some elements are already in a group')
      return true
    }
    members.push(member)
  }

  if (members.length < 2) {
    if (logOn) console.log('[cmdGroup] Need at least 2 valid elements to group')
    return true
  }

  // Create the group
  const result = canvas.groupManager.group(members)

  if (result) {
    // Apply CRDT changes
    applyChangesToCRDT(canvas.handle, [result.changes])

    // Select the new group (by its ID)
    setStore('canvasSlice', 'selectedIds', [result.newGroupId])
    if (logOn) console.log('[cmdGroup] Created group:', result.newGroupId, 'with members:', selectedIds)
  }

  return true
}

function handleUngroup(
  canvas: Parameters<InputCommand>[0]['canvas'],
  selectedIds: string[]
): boolean {
  // Check if any selected ID is a group
  for (const id of selectedIds) {
    const virtualGroup = canvas.groupManager.groups.get(id)
    if (virtualGroup) {
      // Found a group - ungroup it
      const result = canvas.groupManager.ungroup(id)
      if (result) {
        // Apply CRDT changes
        applyChangesToCRDT(canvas.handle, [result.changes])

        // Select the ungrouped members
        setStore('canvasSlice', 'selectedIds', result.memberIds)
        if (logOn) console.log('[cmdGroup] Ungrouped:', id, 'members:', result.memberIds)
        return true
      }
    }
  }

  if (logOn) console.log('[cmdGroup] Nothing to ungroup')
  return true
}
