import React from 'react';
import { ChevronLeft, ChevronRight, List, Maximize2, Minimize2 } from 'lucide-react';
import type { ToolbarGroup } from '../toolbar.types';
import type { MobiRendererHandle } from './index';

export interface MobiToolbarContext {
  mobiRef: React.RefObject<MobiRendererHandle | null>;
  current: number;
  total: number;
  fullWidth: boolean;
}

export function getMobiToolbarGroups(ctx: MobiToolbarContext): ToolbarGroup[] {
  return [
    {
      items: [
        {
          type: 'button',
          icon: <List className="rfp-w-4 rfp-h-4" />,
          tooltip: '目录',
          action: () => ctx.mobiRef.current?.toggleToc(),
        },
      ],
    },
    {
      items: [
        {
          type: 'button',
          icon: <ChevronLeft className="rfp-w-4 rfp-h-4" />,
          tooltip: '上一页',
          action: () => ctx.mobiRef.current?.prevPage(),
        },
        {
          type: 'text',
          content: `${ctx.current} / ${ctx.total}`,
          minWidth: '4rem',
        },
        {
          type: 'button',
          icon: <ChevronRight className="rfp-w-4 rfp-h-4" />,
          tooltip: '下一页',
          action: () => ctx.mobiRef.current?.nextPage(),
        },
      ],
    },
    {
      items: [
        {
          type: 'button',
          icon: ctx.fullWidth
            ? <Minimize2 className="rfp-w-4 rfp-h-4" />
            : <Maximize2 className="rfp-w-4 rfp-h-4" />,
          tooltip: ctx.fullWidth ? '正常宽度' : '全屏宽度',
          action: () => ctx.mobiRef.current?.toggleFullWidth(),
        },
      ],
    },
  ];
}
