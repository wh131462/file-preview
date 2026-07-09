import React from 'react';
import { RotateCcw, Grid3x3, Axis3d, Box } from 'lucide-react';
import type { ToolbarGroup } from '../toolbar.types';
import type { Translator } from '@eternalheart/file-preview-core';

export interface CadRendererHandle {
  resetView: () => void;
  toggleWireframe: () => void;
  toggleGrid: () => void;
  toggleAxes: () => void;
}

export interface CadToolbarContext {
  cadRef: React.RefObject<CadRendererHandle | null>;
  wireframe: boolean;
  showGrid: boolean;
  showAxes: boolean;
  t: Translator;
}

export function getCadToolbarGroups(ctx: CadToolbarContext): ToolbarGroup[] {
  return [
    {
      items: [
        {
          type: 'button',
          icon: <RotateCcw className="rfp-w-4 rfp-h-4" />,
          tooltip: ctx.t('toolbar.reset'),
          action: () => ctx.cadRef.current?.resetView(),
        },
      ],
    },
    {
      items: [
        {
          type: 'button',
          icon: <Box className="rfp-w-4 rfp-h-4" />,
          tooltip: ctx.wireframe ? ctx.t('cad.solid') : ctx.t('cad.wireframe'),
          active: ctx.wireframe,
          action: () => ctx.cadRef.current?.toggleWireframe(),
        },
        {
          type: 'button',
          icon: <Grid3x3 className="rfp-w-4 rfp-h-4" />,
          tooltip: ctx.t('cad.grid'),
          active: ctx.showGrid,
          action: () => ctx.cadRef.current?.toggleGrid(),
        },
        {
          type: 'button',
          icon: <Axis3d className="rfp-w-4 rfp-h-4" />,
          tooltip: ctx.t('cad.axes'),
          active: ctx.showAxes,
          action: () => ctx.cadRef.current?.toggleAxes(),
        },
      ],
    },
  ];
}
