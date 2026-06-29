import React from 'react';
import { AlertCircle, Download, RotateCw } from 'lucide-react';
import type { Translator } from '@eternalheart/file-preview-core';

export interface RendererErrorProps {
  error: Error;
  fileName: string;
  t: Translator;
  onRetry: () => void;
  onDownload: () => void;
}

/**
 * 渲染器错误 UI 组件
 * 显示错误信息、文件名、重试和下载按钮
 */
export const RendererError: React.FC<RendererErrorProps> = ({
  error,
  fileName,
  t,
  onRetry,
  onDownload,
}) => {
  return (
    <div className="rfp-flex rfp-flex-col rfp-items-center rfp-justify-center rfp-h-full rfp-px-4 rfp-text-fg-primary">
      <AlertCircle className="rfp-w-16 rfp-h-16 rfp-mb-4 rfp-text-error" />
      <h3 className="rfp-text-lg rfp-font-semibold rfp-mb-2">
        {t('common.unknown_error')}
      </h3>
      <p className="rfp-text-sm rfp-text-fg-secondary rfp-mb-1 rfp-max-w-md rfp-text-center">
        {error.message}
      </p>
      <p className="rfp-text-xs rfp-text-fg-tertiary rfp-mb-6 rfp-max-w-md rfp-text-center">
        {fileName}
      </p>
      <div className="rfp-flex rfp-gap-3">
        <button
          onClick={onRetry}
          aria-label={t('common.retry')}
          className="rfp-flex rfp-items-center rfp-gap-2 rfp-px-4 rfp-py-2 rfp-bg-surface-2 hover:rfp-bg-surface-3 rfp-rounded-md rfp-text-sm rfp-font-medium rfp-transition-colors"
        >
          <RotateCw className="rfp-w-4 rfp-h-4" />
          {t('common.retry')}
        </button>
        <button
          onClick={onDownload}
          aria-label={t('accessibility.downloadFile')}
          className="rfp-flex rfp-items-center rfp-gap-2 rfp-px-4 rfp-py-2 rfp-bg-surface-2 hover:rfp-bg-surface-3 rfp-rounded-md rfp-text-sm rfp-font-medium rfp-transition-colors"
        >
          <Download className="rfp-w-4 rfp-h-4" />
          {t('common.download')}
        </button>
      </div>
    </div>
  );
};
