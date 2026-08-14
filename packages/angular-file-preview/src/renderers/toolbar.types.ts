/** Lucide icon data (lucide-angular LucideIconData) */
export type ToolbarIcon = unknown;

export interface ToolbarButtonItem {
  type: 'button';
  icon: ToolbarIcon;
  tooltip: string;
  action: () => void;
  disabled?: boolean;
  active?: boolean;
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
