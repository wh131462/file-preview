import { ZoomIn, ZoomOut, RefreshCw, ChevronLeft, ChevronRight, List } from 'lucide-react';
import type { ToolbarGroup } from '../toolbar.types';
import type { Translator } from '@eternalheart/file-preview-core';

export interface PdfToolbarContext {
  zoom: number;
  currentPage: number;
  totalPages: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onToggleOutline?: () => void;
  t: Translator;
}

export function getPdfToolbarGroups(ctx: PdfToolbarContext): ToolbarGroup[] {
  const groups: ToolbarGroup[] = [];

  // 大纲按钮（如果提供了回调）
  if (ctx.onToggleOutline) {
    groups.push({
      items: [
        { type: 'button', icon: <List className="rfp-w-4 rfp-h-4" />, tooltip: ctx.t('toolbar.outline'), action: ctx.onToggleOutline },
      ],
    });
  }

  // 页码切换
  groups.push({
    items: [
      { type: 'button', icon: <ChevronLeft className="rfp-w-4 rfp-h-4" />, tooltip: ctx.t('toolbar.prev_page'), action: ctx.onPrevPage, disabled: ctx.currentPage <= 1 },
      { type: 'text', content: `${ctx.currentPage} / ${ctx.totalPages}`, minWidth: '4rem' },
      { type: 'button', icon: <ChevronRight className="rfp-w-4 rfp-h-4" />, tooltip: ctx.t('toolbar.next_page'), action: ctx.onNextPage, disabled: ctx.currentPage >= ctx.totalPages },
    ],
  });

  // 缩放控制
  groups.push({
    items: [
      { type: 'button', icon: <ZoomOut className="rfp-w-4 rfp-h-4" />, tooltip: ctx.t('toolbar.zoom_out'), action: ctx.onZoomOut, disabled: ctx.zoom <= 0.01 },
      { type: 'text', content: `${Math.round(ctx.zoom * 100)}%`, minWidth: '3rem' },
      { type: 'button', icon: <ZoomIn className="rfp-w-4 rfp-h-4" />, tooltip: ctx.t('toolbar.zoom_in'), action: ctx.onZoomIn, disabled: ctx.zoom >= 10 },
    ],
  });

  // 重置按钮
  groups.push({
    items: [
      { type: 'button', icon: <RefreshCw className="rfp-w-4 rfp-h-4" />, tooltip: ctx.t('toolbar.reset'), action: ctx.onReset },
    ],
  });

  return groups;
}
