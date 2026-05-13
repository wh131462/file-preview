// 类型从 core 包导入并 re-export
export type {
  PreviewFile,
  PreviewFileLink,
  PreviewFileInput,
  FileType,
  PreviewState,
  CustomRendererEventPayload,
} from '@eternalheart/file-preview-core';

import type {
  PreviewFile,
  Locale,
  Translator,
} from '@eternalheart/file-preview-core';
import type { ToolbarGroup } from './renderers/toolbar.types';

// React 专属的 UI 类型
export interface ToolbarAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * 自定义渲染器上下文：注入翻译器、已解析主题、当前 locale 与事件派发器。
 * 通过 `emit(name, payload)` 把事件转发到顶层 `FilePreviewContent.onCustomEvent`。
 */
export interface CustomRendererContext {
  emit: (name: string, payload?: unknown) => void;
  t: Translator;
  theme: 'dark' | 'light';
  locale: Locale;
}

// 自定义渲染器类型
export interface CustomRenderer {
  /** 文件类型匹配函数 */
  test: (file: PreviewFile) => boolean;
  /**
   * 渲染函数：返回 React 节点。ctx 可选，旧版 `render(file)` 仍向后兼容。
   */
  render: (file: PreviewFile, ctx?: CustomRendererContext) => React.ReactNode;
  /**
   * 可选：按 `ToolbarGroup[]` 规范声明自定义工具组。
   * 命中时会替代内置文件类型的工具组；通用操作组（下载、关闭）不受影响。
   */
  getToolbarGroups?: (
    file: PreviewFile,
    ctx: CustomRendererContext,
  ) => ToolbarGroup[];
  /**
   * 可选：事件名白名单，仅作 TS 与文档约定，运行时不做拦截。
   */
  events?: readonly string[];
}
