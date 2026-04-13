import type { ToolbarGroup } from '../toolbar.types';
import { ChevronLeft, ChevronRight, List, Maximize2, Minimize2 } from 'lucide-vue-next';

export interface MobiToolbarContext {
  mobiRef: { prevPage: () => void; nextPage: () => void; toggleFullWidth: () => void; toggleToc: () => void } | null;
  current: number;
  total: number;
  fullWidth: boolean;
}

export function getMobiToolbarGroups(ctx: MobiToolbarContext): ToolbarGroup[] {
  return [
    {
      items: [
        { type: 'button', icon: List, tooltip: '目录', action: () => ctx.mobiRef?.toggleToc() },
      ],
    },
    {
      items: [
        { type: 'button', icon: ChevronLeft, tooltip: '上一页', action: () => ctx.mobiRef?.prevPage() },
        { type: 'text', content: `${ctx.current} / ${ctx.total}`, minWidth: '4rem' },
        { type: 'button', icon: ChevronRight, tooltip: '下一页', action: () => ctx.mobiRef?.nextPage() },
      ],
    },
    {
      items: [
        {
          type: 'button',
          icon: ctx.fullWidth ? Minimize2 : Maximize2,
          tooltip: ctx.fullWidth ? '正常宽度' : '全屏宽度',
          action: () => ctx.mobiRef?.toggleFullWidth(),
        },
      ],
    },
  ];
}
