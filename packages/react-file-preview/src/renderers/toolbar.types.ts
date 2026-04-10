export interface ToolbarButtonItem {
  type: 'button';
  icon: React.ReactNode;
  tooltip: string;
  action: () => void;
  disabled?: boolean;
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
