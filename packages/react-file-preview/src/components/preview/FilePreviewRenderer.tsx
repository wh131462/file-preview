import React, { Suspense } from 'react';
import type { Translator } from '@eternalheart/file-preview-core';
import type { PreviewFile, CustomRenderer, CustomRendererContext } from '../../types';
import { RendererErrorBoundary } from './RendererErrorBoundary';
import { RendererError } from './RendererError';
import { RendererLoading } from '../../renderers/RendererLoading';

export interface FilePreviewRendererProps {
  currentFile: PreviewFile;
  customRenderer?: CustomRenderer | null;
  customRendererContext: CustomRendererContext;
  t: Translator;
  onDownload: () => void;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  children: React.ReactNode;
}

/**
 * 渲染器容器组件
 * 负责 Suspense + 错误边界包装，不负责具体渲染器选择
 */
export const FilePreviewRenderer: React.FC<FilePreviewRendererProps> = ({
  currentFile,
  customRenderer,
  customRendererContext,
  t,
  onDownload,
  onError,
  children,
}) => {
  // 自定义渲染器优先
  if (customRenderer) {
    return (
      <RendererErrorBoundary
        fallback={(error, reset) => (
          <RendererError
            error={error}
            fileName={currentFile.name}
            t={t}
            onRetry={reset}
            onDownload={onDownload}
          />
        )}
        onError={onError}
      >
        {customRenderer.render(currentFile, customRendererContext)}
      </RendererErrorBoundary>
    );
  }

  // 内置渲染器（Suspense + 错误边界）
  return (
    <Suspense fallback={<RendererLoading />} key={currentFile.url}>
      <RendererErrorBoundary
        fallback={(error, reset) => (
          <RendererError
            error={error}
            fileName={currentFile.name}
            t={t}
            onRetry={reset}
            onDownload={onDownload}
          />
        )}
        onError={onError}
      >
        {children}
      </RendererErrorBoundary>
    </Suspense>
  );
};
