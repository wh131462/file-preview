import { useMemo } from 'react';
import type { ToolbarGroup } from '../renderers/toolbar.types';
import type { Translator } from '@eternalheart/file-preview-core';
import type { CustomRenderer, CustomRendererContext, PreviewFile } from '../types';
import type { RendererState } from './types';
import { getToolbarGroups, type ToolbarFactoryContext } from '../toolbar/registry';

/**
 * useToolbarConfig 所需的 handlers（不含 state/t/fileName，由 hook 内部合并）
 */
export type ToolbarConfigHandlers = Omit<ToolbarFactoryContext, 'state' | 't' | 'fileName'>;

export interface UseToolbarConfigParams {
  fileType: string;
  fileName: string;
  state: RendererState;
  handlers: ToolbarConfigHandlers;
  t: Translator;
  customRenderer?: CustomRenderer | null;
  currentFile: PreviewFile;
  customRendererContext: CustomRendererContext;
}

/**
 * 工具栏配置 hook
 * 根据文件类型和自定义渲染器返回工具栏配置
 */
export function useToolbarConfig({
  fileType,
  fileName,
  state,
  handlers,
  t,
  customRenderer,
  currentFile,
  customRendererContext,
}: UseToolbarConfigParams): ToolbarGroup[] {
  return useMemo(() => {
    // 优先使用自定义渲染器的工具栏配置
    if (customRenderer) {
      return customRenderer.getToolbarGroups?.(currentFile, customRendererContext) ?? [];
    }

    // 使用内置工具栏配置注册表
    return getToolbarGroups(fileType, {
      state,
      t,
      fileName,
      ...handlers,
    });
  }, [fileType, fileName, state, handlers, t, customRenderer, currentFile, customRendererContext]);
}
