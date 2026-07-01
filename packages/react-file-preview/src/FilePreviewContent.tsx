import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { getFileType, createTranslator, type Locale, type Messages, type Translator, type Theme, downloadFileWithFetcher } from '@eternalheart/file-preview-core';
import { LocaleProvider } from './i18n/LocaleContext';
import { ThemeProvider } from './ThemeContext';
import type { PreviewFileInput, CustomRenderer, CustomRendererContext } from './types';
import type { CustomRendererEventPayload, PreviewFile, RequestHandler, RequestInitFactory, ShouldFetchAsBlob } from '@eternalheart/file-preview-core';
import { normalizeFiles } from './utils/fileNormalizer';
import { RequestProvider, useResolvedUrl, useFetcher } from './RequestContext';
import type { RendererHandle } from './renderers/base.types';
import type { ToolbarGroup } from './renderers/toolbar.types';
import { UnsupportedRenderer } from './renderers/Unsupported';
import {
  useKeyboardNavigation,
  useThemeMode,
} from './hooks';
import { FilePreviewToolbar, FilePreviewRenderer, NavArrows } from './components/preview';
import { BUILTIN_RENDERERS } from './renderers/registry';

const MAX_ZIP_NESTING_DEPTH = 3;

export interface FilePreviewContentProps {
  files: PreviewFileInput[];
  currentIndex: number;
  onNavigate?: (index: number) => void;
  customRenderers?: CustomRenderer[];
  mode?: 'modal' | 'embed';
  onClose?: () => void;
  zipNestingDepth?: number;
  locale?: Locale;
  messages?: Partial<Record<Locale, Partial<Messages>>>;
  headless?: boolean;
  theme?: Theme;
  onCustomEvent?: (event: CustomRendererEventPayload) => void;
  requestInit?: RequestInitFactory;
  requestHandler?: RequestHandler;
  shouldFetchAsBlob?: ShouldFetchAsBlob;
  onDownload?: (file: PreviewFile) => void;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDownload?: boolean;
}

export const FilePreviewContent: React.FC<FilePreviewContentProps> = (props) => {
  const { requestInit, requestHandler, shouldFetchAsBlob } = props;
  return (
    <RequestProvider
      requestInit={requestInit}
      requestHandler={requestHandler}
      shouldFetchAsBlob={shouldFetchAsBlob}
    >
      <FilePreviewContentInner {...props} />
    </RequestProvider>
  );
};

const FilePreviewContentInner: React.FC<FilePreviewContentProps> = ({
  files,
  currentIndex,
  onNavigate,
  customRenderers = [],
  mode = 'modal',
  onClose,
  zipNestingDepth = 0,
  locale = 'zh-CN',
  messages: userMessages,
  headless = false,
  theme = 'dark',
  onCustomEvent,
  onDownload,
  onError,
  showDownload = true,
  requestInit: _requestInit,
  requestHandler: _requestHandler,
  shouldFetchAsBlob: _shouldFetchAsBlob,
}) => {
  const t: Translator = useMemo(
    () => createTranslator({ locale, messages: userMessages }),
    [locale, userMessages],
  );

  const normalizedFiles = useMemo(() => normalizeFiles(files), [files]);
  const currentFile = normalizedFiles[currentIndex];
  const resolvedUrl = useResolvedUrl(currentFile);
  const fetcher = useFetcher();

  const customRenderer = useMemo(() => {
    if (!currentFile) return null;
    return customRenderers.find(renderer => renderer.test(currentFile));
  }, [currentFile, customRenderers]);

  const fileType = currentFile ? getFileType(currentFile) : 'unsupported';

  // 主题
  const resolvedTheme = useThemeMode(theme);

  // Refs
  const contentRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // 新架构：通用渲染器 ref，用于获取工具栏配置
  const rendererInstanceRef = useRef<RendererHandle | null>(null);
  const [rendererToolbarGroups, setRendererToolbarGroups] = useState<ToolbarGroup[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);

  // 设置渲染器并初始化工具栏（在渲染器挂载/更新时同步触发）
  const setupRenderer = useCallback((renderer: RendererHandle | null) => {
    // 清理旧的订阅
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    rendererInstanceRef.current = renderer;

    if (!renderer?.getToolbarGroups) {
      setRendererToolbarGroups([]);
      return;
    }

    // 立即获取一次初始状态
    const initialGroups = renderer.getToolbarGroups();
    setRendererToolbarGroups(initialGroups);

    // 如果渲染器支持事件订阅，使用事件机制
    if (renderer.onToolbarChange) {
      const unsubscribe = renderer.onToolbarChange(() => {
        const groups = renderer.getToolbarGroups();
        setRendererToolbarGroups(groups);
      });

      cleanupRef.current = unsubscribe;
      return;
    }

    // 回退机制：如果渲染器不支持事件，使用轮询
    const interval = setInterval(() => {
      const groups = renderer.getToolbarGroups();
      setRendererToolbarGroups(groups);
    }, 100);
    cleanupRef.current = () => clearInterval(interval);
  }, []);

  // Callback ref：在渲染器挂载/卸载时立即触发
  const rendererRef = useCallback((renderer: RendererHandle | null) => {
    setupRenderer(renderer);
  }, [setupRenderer]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  // 键盘导航
  useKeyboardNavigation({
    mode,
    currentIndex,
    totalFiles: normalizedFiles.length,
    onNavigate,
    onClose,
    rootRef,
  });

  // 图片自动适应窗口（已禁用，改为手动点击"适应窗口"按钮）
  // useImageAutoFit({
  //   enabled: fileType === 'image',
  //   naturalWidth: state.image.naturalWidth,
  //   naturalHeight: state.image.naturalHeight,
  //   containerRef: contentRef,
  //   onZoomChange: (zoom) => dispatch({ type: 'SET_ZOOM', payload: zoom }),
  // });

  // 自定义渲染器上下文
  const emitCustom = useCallback(
    (name: string, payload?: unknown) => {
      if (!currentFile) return;
      onCustomEvent?.({ name, payload, file: currentFile });
    },
    [currentFile, onCustomEvent],
  );

  const customCtx = useMemo<CustomRendererContext>(
    () => ({ emit: emitCustom, t, theme: resolvedTheme, locale }),
    [emitCustom, t, resolvedTheme, locale],
  );

  const handleDownload = useCallback(async () => {
    if (!currentFile) return;
    if (onDownload) {
      await onDownload(currentFile);
      return;
    }
    try {
      await downloadFileWithFetcher(currentFile.url, currentFile.name, fetcher);
    } catch (err) {
      console.error('[file-preview] download failed:', err);
    }
  }, [currentFile, onDownload, fetcher]);

  if (!currentFile) return null;

  return (
    <LocaleProvider locale={locale} messages={userMessages}>
      <ThemeProvider theme={resolvedTheme}>
        <div
          ref={rootRef}
          tabIndex={mode === 'embed' ? 0 : -1}
          data-theme={resolvedTheme}
          className="rfp-relative rfp-w-full rfp-h-full rfp-flex rfp-flex-col rfp-overflow-hidden rfp-outline-none"
        >
          {!headless && (
            <FilePreviewToolbar
              fileName={currentFile.name}
              currentIndex={currentIndex}
              totalFiles={normalizedFiles.length}
              toolGroups={rendererToolbarGroups}
              t={t}
              onDownload={handleDownload}
              onClose={onClose}
              showDownload={showDownload}
            />
          )}

          <div
            ref={contentRef}
            className="rfp-flex-1 rfp-flex rfp-items-center rfp-justify-center rfp-overflow-auto"
          >
            <FilePreviewRenderer
              currentFile={currentFile}
              customRenderer={customRenderer}
              customRendererContext={customCtx}
              t={t}
              onDownload={handleDownload}
              onError={onError}
            >
              {(() => {
                // ZIP 嵌套深度超限：fallback 到 Unsupported
                if (fileType === 'zip' && zipNestingDepth >= MAX_ZIP_NESTING_DEPTH) {
                  return (
                    <UnsupportedRenderer
                      fileName={currentFile.name}
                      fileType={currentFile.type}
                      onDownload={handleDownload}
                    />
                  );
                }

                // 从注册表查找匹配的渲染器
                const rendererConfig = BUILTIN_RENDERERS.find(
                  (r) => r.fileType === fileType,
                );

                if (rendererConfig) {
                  const RendererComponent = rendererConfig.component;
                  const rendererProps = rendererConfig.getProps({
                    resolvedUrl,
                    zipNestingDepth,
                    currentFile,
                  });
                  return <RendererComponent ref={rendererRef} {...rendererProps} />;
                }

                // 未匹配：fallback 到 UnsupportedRenderer
                return (
                  <UnsupportedRenderer
                    fileName={currentFile.name}
                    fileType={currentFile.type}
                    onDownload={handleDownload}
                  />
                );
              })()}
            </FilePreviewRenderer>
          </div>

          {!headless && normalizedFiles.length > 1 && (
            <NavArrows
              containerRef={contentRef}
              hasPrev={currentIndex > 0}
              hasNext={currentIndex < normalizedFiles.length - 1}
              onPrev={() => onNavigate?.(currentIndex - 1)}
              onNext={() => onNavigate?.(currentIndex + 1)}
              resetKey={currentIndex}
              t={t}
            />
          )}
        </div>
      </ThemeProvider>
    </LocaleProvider>
  );
};
