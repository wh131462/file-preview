import React from 'react';
import { motion } from 'framer-motion';
import { Download, X } from 'lucide-react';
import type { ToolbarGroup } from '../../renderers/toolbar.types';
import type { Translator } from '@eternalheart/file-preview-core';
import { renderToolbarItems } from '../../toolbar/renderItems';

export interface FilePreviewToolbarProps {
  fileName: string;
  currentIndex: number;
  totalFiles: number;
  toolGroups: ToolbarGroup[];
  t: Translator;
  onDownload: () => void;
  onClose?: () => void;
  showDownload: boolean;
}

/**
 * 文件预览顶部工具栏组件
 * - 桌面端：单行显示所有按钮
 * - 移动端：第一行显示文件名 + 下载/关闭，第二行显示工具按钮
 */
export const FilePreviewToolbar: React.FC<FilePreviewToolbarProps> = ({
  fileName,
  currentIndex,
  totalFiles,
  toolGroups,
  t,
  onDownload,
  onClose,
  showDownload,
}) => {
  const showCloseButton = !!onClose;

  // 操作组：下载、关闭（通用，不属于任何 Renderer）
  const actionGroups: ToolbarGroup[] = [
    ...(showDownload
      ? [
          {
            items: [
              {
                type: 'button' as const,
                icon: <Download className="rfp-w-4 rfp-h-4" />,
                tooltip: t('accessibility.downloadFile'),
                action: onDownload,
              },
            ],
          },
        ]
      : []),
    ...(showCloseButton
      ? [
          {
            items: [
              {
                type: 'button' as const,
                icon: <X className="rfp-w-4 rfp-h-4" />,
                tooltip: t('accessibility.closePreview'),
                action: onClose!,
                ariaKeyshortcuts: 'Escape',
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="rfp-flex-shrink-0 rfp-z-10 rfp-backdrop-blur-md rfp-border-b rfp-bg-surface-toolbar rfp-border-line"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* 第一行：文件名 + 分页 + 关闭/下载（移动端右侧）/全部按钮（桌面端） */}
      <div className="rfp-flex rfp-items-center rfp-justify-between rfp-px-3 md:rfp-px-5 rfp-py-1.5 md:rfp-py-2.5">
        {/* 左侧：文件名 + 分页 */}
        <div className="rfp-flex rfp-items-center rfp-flex-1 rfp-min-w-0 rfp-mr-2 md:rfp-mr-3">
          <h2 className="rfp-font-medium rfp-text-xs md:rfp-text-sm rfp-truncate rfp-text-fg-primary">
            {fileName}
          </h2>
          <span
            className="rfp-text-xs rfp-ml-2 rfp-flex-shrink-0 rfp-text-fg-muted"
            aria-live="polite"
            aria-atomic="true"
          >
            {currentIndex + 1}/{totalFiles}
          </span>
        </div>

        {/* 移动端：仅显示下载 + 关闭 */}
        <div className="rfp-flex rfp-items-center rfp-gap-1 md:rfp-hidden rfp-flex-shrink-0">
          {renderToolbarItems(actionGroups, 'rfp-mx-0.5')}
        </div>

        {/* 桌面端：所有工具按钮 */}
        <div className="rfp-hidden md:rfp-flex rfp-items-center rfp-gap-1 rfp-flex-shrink-0">
          {renderToolbarItems(toolGroups, 'rfp-mx-1')}
          {toolGroups.length > 0 && (
            <div className="rfp-w-px rfp-h-4 rfp-mx-1 rfp-bg-divide" />
          )}
          {renderToolbarItems(actionGroups, 'rfp-mx-1')}
        </div>
      </div>

      {/* 第二行：移动端工具按钮 */}
      {toolGroups.length > 0 && (
        <div className="rfp-flex rfp-items-center rfp-gap-1 rfp-px-3 rfp-pb-1.5 rfp-overflow-x-auto scrollbar-hide md:rfp-hidden">
          {renderToolbarItems(toolGroups, 'rfp-mx-0.5')}
        </div>
      )}
    </motion.div>
  );
};
