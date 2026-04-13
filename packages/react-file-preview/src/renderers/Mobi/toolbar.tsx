import React from 'react';
import { ChevronLeft, ChevronRight, List, Maximize2, Minimize2 } from 'lucide-react';
import type { ToolbarGroup } from '../toolbar.types';
import type { MobiRendererHandle } from './index';
import type { Translator } from '@eternalheart/file-preview-core';

export interface MobiToolbarContext {
  mobiRef: React.RefObject<MobiRendererHandle | null>;
  current: number;
  total: number;
  fullWidth: boolean;
  t: Translator;
}

export function getMobiToolbarGroups(ctx: MobiToolbarContext): ToolbarGroup[] {
  return [
    {
      items: [
        {
          type: 'button',
          icon: <List className="rfp-w-4 rfp-h-4" />,
          tooltip: ctx.t('toolbar.toc'),
          action: () => ctx.mobiRef.current?.toggleToc(),
        },
      ],
    },
    {
      items: [
        {
          type: 'button',
          icon: <ChevronLeft className="rfp-w-4 rfp-h-4" />,
          tooltip: ctx.t('toolbar.prev_page'),
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
          tooltip: ctx.t('toolbar.next_page'),
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
          tooltip: ctx.fullWidth ? ctx.t('toolbar.normal_width') : ctx.t('toolbar.full_width'),
          action: () => ctx.mobiRef.current?.toggleFullWidth(),
        },
      ],
    },
  ];
}
