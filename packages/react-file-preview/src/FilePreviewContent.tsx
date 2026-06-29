import React, { useCallback, useMemo, useRef } from 'react';
import { getFileType, createTranslator, type Locale, type Messages, type Translator, type Theme, downloadFileWithFetcher } from '@eternalheart/file-preview-core';
import { LocaleProvider } from './i18n/LocaleContext';
import { ThemeProvider } from './ThemeContext';
import type { PreviewFileInput, CustomRenderer, CustomRendererContext } from './types';
import type { CustomRendererEventPayload, PreviewFile, RequestHandler, RequestInitFactory, ShouldFetchAsBlob } from '@eternalheart/file-preview-core';
import { normalizeFiles } from './utils/fileNormalizer';
import { RequestProvider, useResolvedUrl, useFetcher } from './RequestContext';
import type { EpubRendererHandle } from './renderers/Epub';
import type { MobiRendererHandle } from './renderers/Mobi';
import { UnsupportedRenderer } from './renderers/Unsupported';
import {
  useFilePreviewState,
  useKeyboardNavigation,
  useBookRenderer,
  useThemeMode,
  useImageAutoFit,
  useToolbarConfig,
  type ToolbarConfigHandlers,
} from './hooks';
import { FilePreviewToolbar, FilePreviewRenderer, NavArrows } from './components/preview';
import {
  ImageRenderer,
  PdfRenderer,
  DocxRenderer,
  XlsxRenderer,
  PptxRenderer,
  MsgRenderer,
  EpubRenderer,
  MobiRenderer,
  VideoRenderer,
  AudioRenderer,
  MarkdownRenderer,
  JsonRenderer,
  CsvRenderer,
  XmlRenderer,
  SubtitleRenderer,
  ZipRenderer,
  TextRenderer,
  FontRenderer,
} from './renderers/lazy';

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

  // 状态管理（useReducer）
  const { state, dispatch } = useFilePreviewState(currentIndex);

  // Refs
  const contentRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const epubBook = useBookRenderer<EpubRendererHandle>();
  const mobiBook = useBookRenderer<MobiRendererHandle>();

  // 键盘导航
  useKeyboardNavigation({
    mode,
    currentIndex,
    totalFiles: normalizedFiles.length,
    onNavigate,
    onClose,
    rootRef,
  });

  // 图片自动适应窗口
  useImageAutoFit({
    enabled: fileType === 'image',
    naturalWidth: state.image.naturalWidth,
    naturalHeight: state.image.naturalHeight,
    containerRef: contentRef,
    onZoomChange: (zoom) => dispatch({ type: 'SET_ZOOM', payload: zoom }),
  });

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

  // 事件处理器
  const handleZoomIn = useCallback(() => {
    dispatch({ type: 'SET_ZOOM', payload: Math.min(state.common.zoom + 0.1, 10) });
  }, [state.common.zoom, dispatch]);

  const handleZoomOut = useCallback(() => {
    dispatch({ type: 'SET_ZOOM', payload: Math.max(state.common.zoom - 0.1, 0.01) });
  }, [state.common.zoom, dispatch]);

  const handleRotateLeft = useCallback(() => {
    dispatch({ type: 'SET_ROTATION', payload: state.common.rotation - 90 });
  }, [state.common.rotation, dispatch]);

  const handleRotateRight = useCallback(() => {
    dispatch({ type: 'SET_ROTATION', payload: state.common.rotation + 90 });
  }, [state.common.rotation, dispatch]);

  const handleFitToWidth = useCallback(() => {
    if (contentRef.current && state.image.naturalWidth > 0 && state.image.naturalHeight > 0) {
      const containerWidth = contentRef.current.clientWidth;
      const containerHeight = contentRef.current.clientHeight;
      const scaleX = containerWidth / state.image.naturalWidth;
      const scaleY = containerHeight / state.image.naturalHeight;
      const newZoom = Math.min(scaleX, scaleY);
      dispatch({ type: 'SET_ZOOM', payload: Math.max(0.01, Math.min(10, newZoom)) });
    } else {
      dispatch({ type: 'SET_ZOOM', payload: 1 });
    }
    dispatch({ type: 'SET_ROTATION', payload: 0 });
    dispatch({ type: 'RESET_IMAGE' });
  }, [state.image.naturalWidth, state.image.naturalHeight, dispatch]);

  const handleOriginalSize = useCallback(() => {
    dispatch({ type: 'SET_ZOOM', payload: 1 });
    dispatch({ type: 'SET_ROTATION', payload: 0 });
    dispatch({ type: 'RESET_IMAGE' });
  }, [dispatch]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'SET_ZOOM', payload: 1 });
    dispatch({ type: 'SET_ROTATION', payload: 0 });
    dispatch({ type: 'RESET_IMAGE' });
  }, [dispatch]);

  const handlePrevPage = useCallback(() => {
    if (!contentRef.current) return;
    // 查找包含 [data-page-number] 的滚动容器（PDF 渲染器内部）
    const container = contentRef.current.querySelector<HTMLElement>('.rfp-overflow-auto [data-page-number]')?.parentElement;
    if (!container) return;
    const pages = container.querySelectorAll('[data-page-number]');
    const targetPage = pages[Math.max(0, state.pdf.currentPage - 2)];
    if (targetPage) {
      targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [state.pdf.currentPage]);

  const handleNextPage = useCallback(() => {
    if (!contentRef.current) return;
    // 查找包含 [data-page-number] 的滚动容器（PDF 渲染器内部）
    const container = contentRef.current.querySelector<HTMLElement>('.rfp-overflow-auto [data-page-number]')?.parentElement;
    if (!container) return;
    const pages = container.querySelectorAll('[data-page-number]');
    const targetPage = pages[Math.min(pages.length - 1, state.pdf.currentPage)];
    if (targetPage) {
      targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [state.pdf.currentPage]);

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

  // PDF 回调（需要 useCallback 避免触发 PdfRenderer 内部 useEffect 无限循环）
  const handlePdfPageChange = useCallback(
    (page: number) => dispatch({ type: 'SET_PDF_PAGE', payload: page }),
    [dispatch]
  );

  const handlePdfTotalPagesChange = useCallback(
    (total: number) => dispatch({ type: 'SET_PDF_TOTAL_PAGES', payload: total }),
    [dispatch]
  );

  const handlePdfPageWidthChange = useCallback(
    (w: number) =>
      dispatch({
        type: 'SET_IMAGE_NATURAL_SIZE',
        payload: { width: w, height: state.image.naturalHeight },
      }),
    [state.image.naturalHeight, dispatch]
  );

  const handlePdfToggleOutline = useCallback(
    () => dispatch({ type: 'SET_PDF_OUTLINE', payload: !state.pdf.showOutline }),
    [state.pdf.showOutline, dispatch]
  );

  // Image 回调
  const handleImageZoomChange = useCallback(
    (zoom: number) => dispatch({ type: 'SET_ZOOM', payload: zoom }),
    [dispatch]
  );

  const handleImageNaturalWidthChange = useCallback(
    (w: number) =>
      dispatch({
        type: 'SET_IMAGE_NATURAL_SIZE',
        payload: { width: w, height: state.image.naturalHeight },
      }),
    [state.image.naturalHeight, dispatch]
  );

  const handleImageNaturalHeightChange = useCallback(
    (h: number) =>
      dispatch({
        type: 'SET_IMAGE_NATURAL_SIZE',
        payload: { width: state.image.naturalWidth, height: h },
      }),
    [state.image.naturalWidth, dispatch]
  );

  if (!currentFile) return null;

  // 工具栏 handlers
  const toolbarHandlers: ToolbarConfigHandlers = {
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onRotateLeft: handleRotateLeft,
    onRotateRight: handleRotateRight,
    onReset: handleReset,
    onFitToWidth: handleFitToWidth,
    onOriginalSize: handleOriginalSize,
    onPrevPage: handlePrevPage,
    onNextPage: handleNextPage,
    onToggleOutline: () => dispatch({ type: 'SET_PDF_OUTLINE', payload: !state.pdf.showOutline }),
    onToggleWrap: () => dispatch({ type: 'SET_TEXT_WORD_WRAP', payload: !state.text.wordWrap }),
    onToggleHtmlPreview: () => dispatch({ type: 'SET_TEXT_HTML_PREVIEW', payload: !state.text.htmlPreview }),
    onToggleViewMode: () =>
      dispatch({
        type: 'SET_MARKDOWN_VIEW_MODE',
        payload: state.markdown.viewMode === 'preview' ? 'source' : 'preview',
      }),
    epubRef: epubBook.ref,
    mobiRef: mobiBook.ref,
    epubCurrent: epubBook.current,
    epubTotal: epubBook.total,
    epubFullWidth: epubBook.fullWidth,
    mobiCurrent: mobiBook.current,
    mobiTotal: mobiBook.total,
    mobiFullWidth: mobiBook.fullWidth,
  };

  // 工具栏配置
  const toolGroups = useToolbarConfig({
    fileType,
    fileName: currentFile.name,
    state,
    handlers: toolbarHandlers,
    t,
    customRenderer,
    currentFile,
    customRendererContext: customCtx,
  });

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
              toolGroups={toolGroups}
              t={t}
              onDownload={handleDownload}
              onClose={onClose}
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
              {fileType === 'image' && (
                <ImageRenderer
                  url={resolvedUrl}
                  zoom={state.common.zoom}
                  rotation={state.common.rotation}
                  resetKey={state.image.resetKey}
                  fileSize={currentFile.size}
                  file={currentFile}
                  onZoomChange={handleImageZoomChange}
                  onNaturalWidthChange={handleImageNaturalWidthChange}
                  onNaturalHeightChange={handleImageNaturalHeightChange}
                />
              )}
              {fileType === 'pdf' && (
                <PdfRenderer
                  url={resolvedUrl}
                  zoom={state.common.zoom}
                  currentPage={state.pdf.currentPage}
                  showOutline={state.pdf.showOutline}
                  onPageChange={handlePdfPageChange}
                  onTotalPagesChange={handlePdfTotalPagesChange}
                  onPageWidthChange={handlePdfPageWidthChange}
                  onToggleOutline={handlePdfToggleOutline}
                />
              )}
              {fileType === 'docx' && <DocxRenderer url={resolvedUrl} />}
              {fileType === 'xlsx' && <XlsxRenderer url={resolvedUrl} />}
              {fileType === 'pptx' && <PptxRenderer url={resolvedUrl} />}
              {fileType === 'msg' && <MsgRenderer url={resolvedUrl} />}
              {fileType === 'epub' && (
                <EpubRenderer
                  ref={epubBook.ref as React.RefObject<EpubRendererHandle>}
                  url={resolvedUrl}
                  onChapterChange={epubBook.handleChapterChange}
                  onFullWidthChange={epubBook.setFullWidth}
                />
              )}
              {fileType === 'mobi' && (
                <MobiRenderer
                  ref={mobiBook.ref as React.RefObject<MobiRendererHandle>}
                  url={resolvedUrl}
                  onChapterChange={mobiBook.handleChapterChange}
                  onFullWidthChange={mobiBook.setFullWidth}
                />
              )}
              {fileType === 'video' && <VideoRenderer url={resolvedUrl} fileName={currentFile.name} />}
              {fileType === 'audio' && <AudioRenderer url={resolvedUrl} fileName={currentFile.name} />}
              {fileType === 'markdown' && <MarkdownRenderer url={resolvedUrl} viewMode={state.markdown.viewMode} />}
              {fileType === 'json' && <JsonRenderer url={resolvedUrl} fileName={currentFile.name} />}
              {fileType === 'csv' && <CsvRenderer url={resolvedUrl} fileName={currentFile.name} />}
              {fileType === 'xml' && <XmlRenderer url={resolvedUrl} fileName={currentFile.name} />}
              {fileType === 'subtitle' && <SubtitleRenderer url={resolvedUrl} fileName={currentFile.name} />}
              {fileType === 'zip' &&
                (zipNestingDepth >= MAX_ZIP_NESTING_DEPTH ? (
                  <UnsupportedRenderer
                    fileName={currentFile.name}
                    fileType={currentFile.type}
                    onDownload={handleDownload}
                  />
                ) : (
                  <ZipRenderer
                    url={resolvedUrl}
                    onStatsChange={(stats) => dispatch({ type: 'SET_ZIP_STATS', payload: stats })}
                    nestingDepth={zipNestingDepth}
                  />
                ))}
              {fileType === 'text' && (
                <TextRenderer
                  url={resolvedUrl}
                  fileName={currentFile.name}
                  wordWrap={state.text.wordWrap}
                  htmlPreview={state.text.htmlPreview}
                />
              )}
              {fileType === 'font' && <FontRenderer url={resolvedUrl} />}
              {fileType === 'unsupported' && (
                <UnsupportedRenderer
                  fileName={currentFile.name}
                  fileType={currentFile.type}
                  onDownload={handleDownload}
                />
              )}
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
