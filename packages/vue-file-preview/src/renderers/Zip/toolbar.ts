import type { ToolbarGroup } from '../toolbar.types';
import { formatFileSize } from '@eternalheart/file-preview-core';

export interface ZipToolbarStats {
  files: number;
  dirs: number;
  size: number;
}

export interface ZipToolbarContext {
  stats: ZipToolbarStats | null;
}

export function getZipToolbarGroups({ stats }: ZipToolbarContext): ToolbarGroup[] {
  if (!stats) return [];
  return [
    {
      items: [
        {
          type: 'text',
          content: `${stats.files} files · ${stats.dirs} dirs · ${formatFileSize(stats.size)}`,
          minWidth: '10rem',
        },
      ],
    },
  ];
}
