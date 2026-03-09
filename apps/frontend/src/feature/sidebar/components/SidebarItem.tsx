import type { Component } from "solid-js";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import MoreHorizontal from "lucide-solid/icons/more-horizontal";
import Pencil from "lucide-solid/icons/pencil";
import Trash2 from "lucide-solid/icons/trash-2";

export type SidebarItemProps = {
  name: string;
  selected?: boolean;
  onClick?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
};

const SidebarItem: Component<SidebarItemProps> = (props) => {
  return (
    <div
      class={`group relative flex items-center w-full text-left px-3 py-1.5 cursor-pointer transition-colors ${
        props.selected
          ? "bg-stone-300 dark:bg-stone-700"
          : "hover:bg-stone-200 dark:hover:bg-stone-800"
      }`}
      onClick={() => props.onClick?.()}
    >
      <div class="flex-1 min-w-0">
        <div class="font-medium text-xs text-foreground">{props.name}</div>
      </div>

      {/* Menu Button */}
      <DropdownMenu>
        <DropdownMenu.Trigger
          class="opacity-0 group-hover:opacity-100 data-[expanded]:opacity-100 p-1 hover:bg-stone-300 dark:hover:bg-stone-600 transition-opacity"
          onClick={(e: MouseEvent) => e.stopPropagation()}
        >
          <MoreHorizontal size={14} class="text-muted-foreground" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content class="min-w-[140px] bg-popover text-popover-foreground border border-border shadow-md py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-100">
            <DropdownMenu.Item
              class="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground cursor-pointer outline-none"
              onSelect={() => props.onRename?.()}
            >
              <Pencil size={12} />
              <DropdownMenu.ItemLabel>Rename</DropdownMenu.ItemLabel>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              class="flex items-center gap-2 px-3 py-1.5 text-xs text-destructive data-[highlighted]:bg-destructive data-[highlighted]:text-destructive-foreground cursor-pointer outline-none"
              onSelect={() => props.onDelete?.()}
            >
              <Trash2 size={12} />
              <DropdownMenu.ItemLabel>Delete</DropdownMenu.ItemLabel>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu>
    </div>
  );
};

export default SidebarItem;
