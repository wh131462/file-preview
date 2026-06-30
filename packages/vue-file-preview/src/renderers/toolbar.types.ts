import type { Component } from 'vue';

export interface ToolbarButtonItem {
  type: 'button';
  icon: Component;
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

// 工具栏段：内置渲染器与自定义渲染器均可直接复用此 `ToolbarGroup` 类型，
// 保证自定义工具组与内置工具组走同一条渲染管线（按钮、分隔符、Tooltip 行为一致）。
export interface ToolbarGroup {
  items: ToolbarItem[];
}
