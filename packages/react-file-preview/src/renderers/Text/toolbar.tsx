import { WrapText, Eye, Code } from 'lucide-react';
import type { ToolbarGroup } from '../toolbar.types';
import type { Translator } from '@eternalheart/file-preview-core';

export interface TextToolbarContext {
  wordWrap: boolean;
  onToggleWrap: () => void;
  isHtml: boolean;
  htmlPreview: boolean;
  onToggleHtmlPreview: () => void;
  t: Translator;
}

export function getTextToolbarGroups(ctx: TextToolbarContext): ToolbarGroup[] {
  const groups: ToolbarGroup[] = [
    {
      items: [
        {
          type: 'button',
          icon: <WrapText className="rfp-w-4 rfp-h-4" />,
          tooltip: ctx.wordWrap ? ctx.t('toolbar.wrap_off') : ctx.t('toolbar.wrap_on'),
          action: ctx.onToggleWrap,
        },
      ],
    },
  ];

  if (ctx.isHtml) {
    groups.push({
      items: [
        {
          type: 'button',
          icon: ctx.htmlPreview
            ? <Code className="rfp-w-4 rfp-h-4" />
            : <Eye className="rfp-w-4 rfp-h-4" />,
          tooltip: ctx.htmlPreview ? ctx.t('toolbar.source') : ctx.t('toolbar.preview'),
          action: ctx.onToggleHtmlPreview,
        },
      ],
    });
  }

  return groups;
}
