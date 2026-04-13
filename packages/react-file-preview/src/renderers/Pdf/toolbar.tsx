import { ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import type { ToolbarGroup } from '../toolbar.types';
import type { Translator } from '@eternalheart/file-preview-core';

export interface PdfToolbarContext {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  t: Translator;
}

export function getPdfToolbarGroups(ctx: PdfToolbarContext): ToolbarGroup[] {
  return [
    {
      items: [
        { type: 'button', icon: <ZoomOut className="rfp-w-4 rfp-h-4" />, tooltip: ctx.t('toolbar.zoom_out'), action: ctx.onZoomOut, disabled: ctx.zoom <= 0.01 },
        { type: 'text', content: `${Math.round(ctx.zoom * 100)}%`, minWidth: '3rem' },
        { type: 'button', icon: <ZoomIn className="rfp-w-4 rfp-h-4" />, tooltip: ctx.t('toolbar.zoom_in'), action: ctx.onZoomIn, disabled: ctx.zoom >= 10 },
      ],
    },
    {
      items: [
        { type: 'button', icon: <RefreshCw className="rfp-w-4 rfp-h-4" />, tooltip: ctx.t('toolbar.reset'), action: ctx.onReset },
      ],
    },
  ];
}
