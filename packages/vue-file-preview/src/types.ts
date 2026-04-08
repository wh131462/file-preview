// 类型从 core 包导入并 re-export
export type {
  PreviewFile,
  PreviewFileLink,
  PreviewFileInput,
  FileType,
  PreviewState,
} from '@eternalheart/file-preview-core';

import type { PreviewFile } from '@eternalheart/file-preview-core';
import type { Component, VNode } from 'vue';

/**
 * 工具栏自定义动作
 */
export interface ToolbarAction {
  /** 图标节点 (建议使用 lucide-vue-next 的图标组件) */
  icon: VNode | Component;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * 自定义渲染器：根据文件类型匹配并返回 Vue 组件
 */
export interface CustomRenderer {
  /** 测试函数：返回 true 表示匹配此文件 */
  test: (file: PreviewFile) => boolean;
  /** 渲染组件：返回一个 Vue 组件，将以 props {{ file }} 调用 */
  render: (file: PreviewFile) => Component;
}
