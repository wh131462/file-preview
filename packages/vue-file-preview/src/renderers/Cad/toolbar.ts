import { RotateCcw, Grid3x3, Axis3d, Box } from 'lucide-vue-next';
import type { ToolbarGroup } from '../toolbar.types';
import type { Translator } from '@eternalheart/file-preview-core';

export interface CadToolbarContext {
  cadRef: { resetView: () => void; toggleWireframe: () => void; toggleGrid: () => void; toggleAxes: () => void } | null;
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
          icon: RotateCcw,
          tooltip: ctx.t('toolbar.reset'),
          action: () => ctx.cadRef?.resetView(),
        },
      ],
    },
    {
      items: [
        {
          type: 'button',
          icon: Box,
          tooltip: ctx.wireframe ? ctx.t('cad.solid') : ctx.t('cad.wireframe'),
          active: ctx.wireframe,
          action: () => ctx.cadRef?.toggleWireframe(),
        },
        {
          type: 'button',
          icon: Grid3x3,
          tooltip: ctx.t('cad.grid'),
          active: ctx.showGrid,
          action: () => ctx.cadRef?.toggleGrid(),
        },
        {
          type: 'button',
          icon: Axis3d,
          tooltip: ctx.t('cad.axes'),
          active: ctx.showAxes,
          action: () => ctx.cadRef?.toggleAxes(),
        },
      ],
    },
  ];
}
