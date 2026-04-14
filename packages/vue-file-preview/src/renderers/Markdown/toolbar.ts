import { h } from 'vue';
import { Eye, Code } from 'lucide-vue-next';
import type { ToolbarGroup } from '../toolbar.types';
import type { Translator } from '@eternalheart/file-preview-core';

export interface MarkdownToolbarContext {
  viewMode: 'preview' | 'source';
  onToggleViewMode: () => void;
  t: Translator;
}

export function getMarkdownToolbarGroups(ctx: MarkdownToolbarContext): ToolbarGroup[] {
  return [
    {
      items: [
        {
          type: 'button',
          icon: ctx.viewMode === 'preview'
            ? h(Code, { class: 'vfp-w-4 vfp-h-4' })
            : h(Eye, { class: 'vfp-w-4 vfp-h-4' }),
          tooltip: ctx.viewMode === 'preview' ? ctx.t('toolbar.source') : ctx.t('toolbar.preview'),
          action: ctx.onToggleViewMode,
        },
      ],
    },
  ];
}
