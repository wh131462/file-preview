import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { getFileType, createFetcher, createTranslator, resolveShowClose, resolveConsumableUrl, isInlineResourceUrl, type EmptyHintMode, type Locale, type Messages, type Translator, type Theme, downloadFileWithFetcher, type FileLoader } from '@eternalheart/file-preview-core';
import { LocaleProvider, useLocale, useTranslator } from './i18n/LocaleContext';
import { ThemeProvider } from './ThemeContext';
import type { PreviewFileInput, CustomRenderer, CustomRendererContext } from './types';
import type { CustomRendererEventPayload, PreviewFile, RequestHandler, RequestInitFactory, ShouldFetchAsBlob, PreviewErrorPayload, PreviewRenderedPayload } from '@eternalheart/file-preview-core';
import { normalizeFiles } from './utils/fileNormalizer';
import { RequestProvider, useResolvedUrl } from './RequestContext';
import { usePreviewEventsChannel, PreviewEventsProvider } from './PreviewEventsContext';
import type { RendererHandle } from './renderers/base.types';
import type { ToolbarGroup } from './renderers/toolbar.types';
import { UnsupportedRenderer } from './renderers/Unsupported';
import { RendererLoading } from './renderers/RendererLoading';
import {
  useKeyboardNavigation,
  useThemeMode,
} from './hooks';
import { FilePreviewToolbar, FilePreviewRenderer, NavArrows } from './components/preview';
import { BUILTIN_RENDERERS } from './renderers/registry';

const MAX_ZIP_NESTING_DEPTH = 3;

/** 加载/渲染失败回调载荷。 */
export type PreviewErrorPayloadHandler = (payload: PreviewErrorPayload) => void;

/**
 * 1.6.13 及之前的渲染错误回调签名。
 * @deprecated 请使用 `(payload: PreviewErrorPayload) => void`；
 * 仅在渲染错误且回调声明了两个参数时兼容调用。
 */
export type PreviewLegacyErrorHandler = (error: Error, errorInfo: React.ErrorInfo) => void;

export type PreviewErrorHandler = PreviewErrorPayloadHandler | PreviewLegacyErrorHandler;

const DEPRECATED_REQUEST_PROPS = ['requestInit', 'requestHandler', 'shouldFetchAsBlob'] as const;
let deprecatedRequestWarningShown = false;

/** 过渡期提示：旧鉴权参数已废弃，1.8.0 移除。 */
function warnDeprecatedRequestProps(used: Partial<Record<(typeof DEPRECATED_REQUEST_PROPS)[number], unknown>>): void {
  if (deprecatedRequestWarningShown) return;
  const names = DEPRECATED_REQUEST_PROPS.filter((name) => used[name] !== undefined);
  if (names.length === 0) return;
  deprecatedRequestWarningShown = true;
  console.warn(
    `[file-preview] ${names.map((name) => `\`${name}\``).join('、')} 已废弃，将在 1.8.0 移除；请改用 \`loadFile\`（简单场景可用 \`withHeaders\`）。`,
  );
}

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
  /** 统一取数入口：鉴权 / 签名场景下由宿主决定文件怎么取 */
  loadFile?: FileLoader;
  /** @deprecated 将在 1.8.0 移除；请改用 `loadFile` */
  requestInit?: RequestInitFactory;
  /** @deprecated 将在 1.8.0 移除；请改用 `loadFile` */
  requestHandler?: RequestHandler;
  /** @deprecated 将在 1.8.0 移除；请改用 `loadFile` */
  shouldFetchAsBlob?: ShouldFetchAsBlob;
  onDownload?: (file: PreviewFile) => void;
  /**
   * 加载/渲染失败回调。
   * 每次加载最多触发一次，payload 已由顶层补全 file/index/stage。
   * 兼容旧版 `(error, errorInfo)` 渲染错误签名（仅渲染阶段触发且需两个形参）。
   */
  onError?: PreviewErrorHandler;
  /**
   * 首屏内容可交互回调（每次加载最多触发一次）。
   * payload 含 file/index/fileType 与 begin → ready 的耗时。
   */
  onRendered?: (payload: PreviewRenderedPayload) => void;
  /** 是否显示关闭按钮，默认根据 mode 决定（modal: true, embed: false） */
  showClose?: boolean;
  showDownload?: boolean;
  /** 是否显示文件导航箭头，默认 true */
  showNavigation?: boolean;
  /** 是否循环导航文件，默认 false */
  loopNavigation?: boolean;
  /**
   * 空内容提示策略，默认 'auto'
   * - 'auto'：文本类（text/json）保持原生空白；结构化类型（xlsx/pptx）显示空提示
   * - 'always'：全部显示空提示，文案取 `messages['file.empty']`
   * - 'never'：一律保持空白
   */
  emptyHint?: EmptyHintMode;
}

export const FilePreviewContent: React.FC<FilePreviewContentProps> = (props) => {
  const { loadFile, requestInit, requestHandler, shouldFetchAsBlob } = props;
  // 请求层错误出口：RequestProvider 在上层创建 fetcher，Inner 负责绑定事件通道
  const requestErrorRef = useRef<((url: string, error: unknown) => void) | null>(null);
  const handleRequestError = useCallback((url: string, error: unknown) => {
    requestErrorRef.current?.(url, error);
  }, []);

  useEffect(() => {
    warnDeprecatedRequestProps({ requestInit, requestHandler, shouldFetchAsBlob });
  }, [requestInit, requestHandler, shouldFetchAsBlob]);

  return (
    <RequestProvider
      loadFile={loadFile}
      requestInit={requestInit}
      requestHandler={requestHandler}
      shouldFetchAsBlob={shouldFetchAsBlob}
      onRequestError={handleRequestError}
    >
      <FilePreviewContentInner {...props} requestErrorRef={requestErrorRef} />
    </RequestProvider>
  );
};

interface FilePreviewContentInnerProps extends FilePreviewContentProps {
  /** 请求层错误出口，绑定到事件通道 */
  requestErrorRef?: React.MutableRefObject<((url: string, error: unknown) => void) | null>;
}

const FilePreviewContentInner: React.FC<FilePreviewContentInnerProps> = ({
  files,
  currentIndex,
  onNavigate,
  customRenderers = [],
  mode = 'modal',
  onClose,
  zipNestingDepth = 0,
  locale: localeProp,
  messages: userMessages,
  headless = false,
  theme = 'dark',
  onCustomEvent,
  onDownload,
  onError,
  onRendered,
  requestErrorRef,
  showClose,
  showDownload = true,
  showNavigation = true,
  loopNavigation = false,
  emptyHint,
  requestInit,
  requestHandler,
  loadFile,
  shouldFetchAsBlob: _shouldFetchAsBlob,
}) => {
  const parentLocale = useLocale();
  const parentT = useTranslator();
  const locale = localeProp ?? parentLocale;
  const t: Translator = useMemo(
    () => userMessages === undefined && locale === parentLocale
      ? parentT
      : createTranslator({ locale, messages: userMessages }),
    [locale, userMessages, parentLocale, parentT],
  );

  const normalizedFiles = useMemo(() => normalizeFiles(files), [files]);
  const currentFile = normalizedFiles[currentIndex];
  // blob 预取失败出口：延迟绑定事件通道，避免声明顺序依赖
  const reportBlobErrorRef = useRef<((error: unknown) => void) | null>(null);
  const handleBlobError = useCallback((error: unknown) => {
    reportBlobErrorRef.current?.(error);
  }, []);
  const resolvedUrl = useResolvedUrl(currentFile, handleBlobError);
  // 下载走独立 fetcher：下载失败不属于预览加载失败，不能触发 onError
  const downloadFetcher = useMemo(
    () => createFetcher({ requestInit, requestHandler }),
    [requestInit, requestHandler],
  );

  // 宿主回调适配：兼容旧版 (error, errorInfo) 签名，只用于渲染阶段错误
  const notifyHost = useCallback((payload: PreviewErrorPayload) => {
    const handler = onError;
    if (!handler) return;
    if (handler.length >= 2) {
      if (payload.stage === 'render' && payload.cause !== undefined) {
        (handler as PreviewLegacyErrorHandler)(
          payload.error as Error,
          payload.cause as React.ErrorInfo,
        );
      }
      return;
    }
    (handler as PreviewErrorPayloadHandler)(payload);
  }, [onError]);

  // 事件通道：渲染器上报口 + 顶层聚合（补 file/index、代次校验、去重）
  const events = usePreviewEventsChannel(
    () => ({
      file: currentFile,
      index: currentIndex,
      urls: [currentFile?.url ?? '', resolvedUrl].filter(Boolean),
    }),
    notifyHost,
    onRendered,
  );

  useEffect(() => {
    reportBlobErrorRef.current = (error) => events.report(error, 'request');
  }, [events]);

  useEffect(() => {
    if (!requestErrorRef) return;
    // blob 预取场景下 fetcher 收到的是原始 URL，按原 URL 校验代次
    requestErrorRef.current = (url, error) => {
      if (!currentFile || url !== currentFile.url) return;
      events.report(error, 'request');
    };
    return () => {
      requestErrorRef.current = null;
    };
  }, [events, requestErrorRef, currentFile]);

  // 切换文件或换 URL 即进入新代次，允许再次上报（按稳定字段而非对象身份）
  useEffect(() => {
    events.reset();
  }, [events, currentIndex, currentFile?.url]);

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
  const [rendererToolbarGroups, setRendererToolbarGroups] = useState<ToolbarGroup[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);

  // 设置渲染器并初始化工具栏（在渲染器挂载/更新时同步触发）
  const setupRenderer = useCallback((renderer: RendererHandle | null) => {
    // 清理旧的订阅
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

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
    loopNavigation,
    rootRef,
  });

  const navigatePrevious = useCallback(() => {
    if (!onNavigate || normalizedFiles.length <= 1) return;
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    } else if (loopNavigation) {
      onNavigate(normalizedFiles.length - 1);
    }
  }, [currentIndex, loopNavigation, normalizedFiles.length, onNavigate]);

  const navigateNext = useCallback(() => {
    if (!onNavigate || normalizedFiles.length <= 1) return;
    if (currentIndex < normalizedFiles.length - 1) {
      onNavigate(currentIndex + 1);
    } else if (loopNavigation) {
      onNavigate(0);
    }
  }, [currentIndex, loopNavigation, normalizedFiles.length, onNavigate]);

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
    // 与 useResolvedUrl 保持一致：本地文件 / inline URL / 不支持类型不走 loadFile
    const canUseLoader = !!loadFile
      && !currentFile.file
      && !isInlineResourceUrl(currentFile.url)
      && getFileType(currentFile) !== 'unsupported';
    // resolvedUrl 回退成原始 URL 说明上次解析失败，此时不能直接下载原始 URL（混合内容 / 跨域）
    const reusableUrl = canUseLoader && resolvedUrl && resolvedUrl !== currentFile.url
      ? resolvedUrl
      : '';
    let tempRevoke: (() => void) | null = null;
    try {
      let downloadUrl = reusableUrl;
      if (!downloadUrl && canUseLoader && loadFile) {
        // 未解析或上次解析失败：重新走 loadFile（宿主代理 / 鉴权逻辑）
        const resolved = resolveConsumableUrl(
          await loadFile(currentFile, { signal: new AbortController().signal }),
        );
        downloadUrl = resolved.url;
        tempRevoke = resolved.revoke;
      }
      await downloadFileWithFetcher(
        downloadUrl || resolvedUrl || currentFile.url,
        currentFile.name,
        downloadFetcher,
      );
    } catch (err) {
      console.error('[file-preview] download failed:', err);
    } finally {
      tempRevoke?.();
    }
  }, [currentFile, onDownload, loadFile, resolvedUrl, downloadFetcher]);

  // 错误边界捕获（渲染器抛出的未捕获异常）统一走事件通道
  const handleRendererError = useCallback(
    (error: Error, errorInfo: React.ErrorInfo) => {
      events.report(error, 'render', errorInfo);
    },
    [events],
  );

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
              showClose={resolveShowClose(mode, showClose)}
              showDownload={showDownload}
            />
          )}

          <div
            ref={contentRef}
            className="rfp-isolate rfp-flex-1 rfp-flex rfp-items-center rfp-justify-center rfp-overflow-auto"
          >
            <PreviewEventsProvider value={events}>
              <FilePreviewRenderer
                currentFile={currentFile}
                customRenderer={customRenderer}
                customRendererContext={customCtx}
                t={t}
                onDownload={handleDownload}
                onError={handleRendererError}
              >
              {(() => {
                // 取数尚未就绪（loadFile 托管 / blob 预取）：先展示加载态，
                // 避免 video / audio / pdf 等以空 URL 初始化。
                if (!resolvedUrl) return <RendererLoading />;
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
                const rendererConfig =
                  BUILTIN_RENDERERS.find((r) => r.fileType === fileType) ??
                  (fileType === 'xls'
                    ? BUILTIN_RENDERERS.find((r) => r.fileType === 'xlsx')
                    : undefined);

                if (rendererConfig) {
                  const RendererComponent = rendererConfig.component;
                  const rendererProps = rendererConfig.getProps({
                    resolvedUrl,
                    zipNestingDepth,
                    currentFile,
                    emptyHint,
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
            </PreviewEventsProvider>
          </div>

          {!headless && showNavigation && normalizedFiles.length > 1 && (
            <NavArrows
              containerRef={contentRef}
              hasPrev={loopNavigation || currentIndex > 0}
              hasNext={loopNavigation || currentIndex < normalizedFiles.length - 1}
              onPrev={navigatePrevious}
              onNext={navigateNext}
              resetKey={currentIndex}
              t={t}
            />
          )}
        </div>
      </ThemeProvider>
    </LocaleProvider>
  );
};
