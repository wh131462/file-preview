import { h } from 'vue';
import { WrapText, Eye, Code } from 'lucide-vue-next';
import type { ToolbarGroup } from '../toolbar.types';

export interface TextToolbarContext {
  wordWrap: boolean;
  onToggleWrap: () => void;
  isHtml: boolean;
  htmlPreview: boolean;
  onToggleHtmlPreview: () => void;
}

export function getTextToolbarGroups(ctx: TextToolbarContext): ToolbarGroup[] {
  const groups: ToolbarGroup[] = [
    {
      items: [
        {
          type: 'button',
          icon: h(WrapText, { class: 'vfp-w-4 vfp-h-4' }),
          tooltip: ctx.wordWrap ? '不换行' : '自动换行',
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
            ? h(Code, { class: 'vfp-w-4 vfp-h-4' })
            : h(Eye, { class: 'vfp-w-4 vfp-h-4' }),
          tooltip: ctx.htmlPreview ? '源码' : '预览',
          action: ctx.onToggleHtmlPreview,
        },
      ],
    });
  }

  return groups;
}
