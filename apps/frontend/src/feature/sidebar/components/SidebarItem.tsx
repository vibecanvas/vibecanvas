import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import MoreHorizontal from "lucide-solid/icons/more-horizontal";
import Pencil from "lucide-solid/icons/pencil";
import Trash2 from "lucide-solid/icons/trash-2";
import type { Component } from "solid-js";
import styles from "./SidebarItem.module.css";

export type SidebarItemProps = {
  name: string;
  selected?: boolean;
  onClick?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
};

const SidebarItem: Component<SidebarItemProps> = (props) => {
  const canvasButtonClass = () => {
    return [styles.canvasButton, props.selected ? styles.canvasButtonSelected : ""].filter(Boolean).join(" ");
  };

  const dangerMenuItemClass = `${styles.menuItem} ${styles.menuItemDanger}`;

  return (
    <div class={styles.root}>
      <button
        type="button"
        class={canvasButtonClass()}
        onClick={() => props.onClick?.()}
      >
        <span class={styles.label}>{props.name}</span>
      </button>

      <DropdownMenu modal={false}>
        <DropdownMenu.Trigger class={styles.menuTrigger}>
          <MoreHorizontal size={14} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content class={styles.menuContent}>
            <DropdownMenu.Item
              class={styles.menuItem}
              onSelect={() => props.onRename?.()}
            >
              <Pencil size={12} />
              <DropdownMenu.ItemLabel>Rename</DropdownMenu.ItemLabel>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              class={dangerMenuItemClass}
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
