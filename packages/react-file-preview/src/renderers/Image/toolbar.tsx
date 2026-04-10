import React from 'react';
import { ZoomIn, ZoomOut, RotateCw, RotateCcw, Scan, RefreshCw } from 'lucide-react';
import type { ToolbarGroup } from '../toolbar.types';

const OriginalSizeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <text x="12" y="17.5" textAnchor="middle" fontSize="20" fontWeight="bold" fill="currentColor" stroke="none">
      1:1
    </text>
  </svg>
);

export interface ImageToolbarContext {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToWidth: () => void;
  onOriginalSize: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onReset: () => void;
}

export function getImageToolbarGroups(ctx: ImageToolbarContext): ToolbarGroup[] {
  return [
    {
      items: [
        { type: 'button', icon: <ZoomOut className="rfp-w-4 rfp-h-4" />, tooltip: '缩小', action: ctx.onZoomOut, disabled: ctx.zoom <= 0.01 },
        { type: 'text', content: `${Math.round(ctx.zoom * 100)}%`, minWidth: '3rem' },
        { type: 'button', icon: <ZoomIn className="rfp-w-4 rfp-h-4" />, tooltip: '放大', action: ctx.onZoomIn, disabled: ctx.zoom >= 10 },
      ],
    },
    {
      items: [
        { type: 'button', icon: <Scan className="rfp-w-4 rfp-h-4" />, tooltip: '适应窗口', action: ctx.onFitToWidth },
        { type: 'button', icon: <OriginalSizeIcon className="rfp-w-4 rfp-h-4" />, tooltip: '原始尺寸', action: ctx.onOriginalSize },
      ],
    },
    {
      items: [
        { type: 'button', icon: <RotateCcw className="rfp-w-4 rfp-h-4" />, tooltip: '向左旋转', action: ctx.onRotateLeft },
        { type: 'button', icon: <RotateCw className="rfp-w-4 rfp-h-4" />, tooltip: '向右旋转', action: ctx.onRotateRight },
      ],
    },
    {
      items: [
        { type: 'button', icon: <RefreshCw className="rfp-w-4 rfp-h-4" />, tooltip: '复原', action: ctx.onReset },
      ],
    },
  ];
}
