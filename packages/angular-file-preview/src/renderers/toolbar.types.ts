import type { LucideIconData } from 'lucide-angular';

export interface ToolbarButtonItem {
  type: 'button';
  icon: LucideIconData;
  tooltip: string;
  action: () => void;
  disabled?: boolean;
  active?: boolean;
  ariaKeyshortcuts?: string;
}

export interface ToolbarTextItem {
  type: 'text';
  content: string;
  minWidth?: string;
}

export type ToolbarItem = ToolbarButtonItem | ToolbarTextItem;

export interface ToolbarGroup {
  items: ToolbarItem[];
}
