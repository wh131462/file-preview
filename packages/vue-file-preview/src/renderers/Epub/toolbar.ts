import { ChevronLeft, ChevronRight, List, Maximize2, Minimize2 } from 'lucide-vue-next';
import type { ToolbarGroup } from '../toolbar.types';

export interface EpubToolbarContext {
  epubRef: { prevChapter: () => void; nextChapter: () => void; toggleFullWidth: () => void; toggleToc: () => void } | null;
  current: number;
  total: number;
  fullWidth: boolean;
}

export function getEpubToolbarGroups(ctx: EpubToolbarContext): ToolbarGroup[] {
  return [
    {
      items: [
        { type: 'button', icon: List, tooltip: '目录', action: () => ctx.epubRef?.toggleToc() },
      ],
    },
    {
      items: [
        { type: 'button', icon: ChevronLeft, tooltip: '上一章', action: () => ctx.epubRef?.prevChapter() },
        { type: 'text', content: `${ctx.current} / ${ctx.total}`, minWidth: '4rem' },
        { type: 'button', icon: ChevronRight, tooltip: '下一章', action: () => ctx.epubRef?.nextChapter() },
      ],
    },
    {
      items: [
        {
          type: 'button',
          icon: ctx.fullWidth ? Minimize2 : Maximize2,
          tooltip: ctx.fullWidth ? '正常宽度' : '全屏宽度',
          action: () => ctx.epubRef?.toggleFullWidth(),
        },
      ],
    },
  ];
}
