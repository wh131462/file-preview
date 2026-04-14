import { Eye, Code } from 'lucide-react';
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
            ? <Code className="rfp-w-4 rfp-h-4" />
            : <Eye className="rfp-w-4 rfp-h-4" />,
          tooltip: ctx.viewMode === 'preview' ? ctx.t('toolbar.source') : ctx.t('toolbar.preview'),
          action: ctx.onToggleViewMode,
        },
      ],
    },
  ];
}
