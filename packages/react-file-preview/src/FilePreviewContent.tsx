import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { getFileType, createTranslator, type Locale, type Messages, type Translator, type Theme } from '@eternalheart/file-preview-core';
import { LocaleProvider } from './i18n/LocaleContext';
import { ThemeProvider } from './ThemeContext';
import type { ToolbarGroup } from './renderers/toolbar.types';
import { getImageToolbarGroups } from './renderers/Image/toolbar';
import { getPdfToolbarGroups } from './renderers/Pdf/toolbar';
import { getEpubToolbarGroups } from './renderers/Epub/toolbar';
import { getMobiToolbarGroups } from './renderers/Mobi/toolbar';
import { getZipToolbarGroups, type ZipToolbarStats } from './renderers/Zip/toolbar';
import { getTextToolbarGroups } from './renderers/Text/toolbar';
import { getMarkdownToolbarGroups } from './renderers/Markdown/toolbar';

import { PreviewFileInput, CustomRenderer, CustomRendererContext } from './types';
import type { CustomRendererEventPayload } from '@eternalheart/file-preview-core';
import { normalizeFiles } from './utils/fileNormalizer';
import { ImageRenderer } from './renderers/Image';
import { PdfRenderer } from './renderers/Pdf';
import { DocxRenderer } from './renderers/Docx';
import { XlsxRenderer } from './renderers/Xlsx';
import { PptxRenderer } from './renderers/Pptx';
import { MsgRenderer } from './renderers/Msg';
import { EpubRenderer } from './renderers/Epub';
import type { EpubRendererHandle } from './renderers/Epub';
import { MobiRenderer } from './renderers/Mobi';
import type { MobiRendererHandle } from './renderers/Mobi';
import { VideoRenderer } from './renderers/Video';
import { AudioRenderer } from './renderers/Audio';
import { MarkdownRenderer } from './renderers/Markdown';
import { JsonRenderer } from './renderers/Json';
import { CsvRenderer } from './renderers/Csv';
import { XmlRenderer } from './renderers/Xml';
import { SubtitleRenderer } from './renderers/Subtitle';
import { ZipRenderer } from './renderers/Zip';
import { TextRenderer } from './renderers/Text';
import { UnsupportedRenderer } from './renderers/Unsupported';

const MAX_ZIP_NESTING_DEPTH = 3;

export interface FilePreviewContentProps {
  files: PreviewFileInput[];
  currentIndex: number;
  onNavigate?: (index: number) => void;
  customRenderers?: CustomRenderer[];
  /** 运行模式:modal(弹窗) 或 embed(嵌入) */
  mode?: 'modal' | 'embed';
  /** 关闭回调,仅 modal 模式使用 */
  onClose?: () => void;
  /** ZIP 嵌套深度（内部使用），超过上限时不再递归渲染 ZIP */
  zipNestingDepth?: number;
  /** 国际化语言，默认 'zh-CN' */
  locale?: Locale;
  /** 用户自定义翻译字典，浅合并到内置字典之上 */
  messages?: Partial<Record<Locale, Partial<Messages>>>;
  /** 无头模式：隐藏工具栏和导航箭头，仅渲染文件内容 */
  headless?: boolean;
  /** 主题模式，默认 'dark' */
  theme?: Theme;
  /** 自定义渲染器派发的事件出口，载荷为 `{ name, payload, file }` */
  onCustomEvent?: (event: CustomRendererEventPayload) => void;
}

export const FilePreviewContent: React.FC<FilePreviewContentProps> = ({
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
}) => {
  const t: Translator = useMemo(
    () => createTranslator({ locale, messages: userMessages }),
    [locale, userMessages],
  );

  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true,
  );

  useEffect(() => {
    if (theme !== 'auto') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);

  const resolvedTheme = theme === 'auto' ? (systemDark ? 'dark' : 'light') : theme;

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [, setTotalPages] = useState(1);
  const [contentNaturalWidth, setContentNaturalWidth] = useState(0);
  const [contentNaturalHeight, setContentNaturalHeight] = useState(0);
  const [imageResetKey, setImageResetKey] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const epubRef = useRef<EpubRendererHandle>(null);
  const [epubCurrent, setEpubCurrent] = useState(0);
  const [epubTotal, setEpubTotal] = useState(0);
  const [epubFullWidth, setEpubFullWidth] = useState(false);
  const mobiRef = useRef<MobiRendererHandle>(null);
  const [mobiCurrent, setMobiCurrent] = useState(0);
  const [mobiTotal, setMobiTotal] = useState(0);
  const [mobiFullWidth, setMobiFullWidth] = useState(false);
  const [zipStats, setZipStats] = useState<ZipToolbarStats | null>(null);
  const [textWordWrap, setTextWordWrap] = useState(true);
  const [textHtmlPreview, setTextHtmlPreview] = useState(false);
  const [markdownViewMode, setMarkdownViewMode] = useState<'preview' | 'source'>('preview');

  // 导航箭头自动隐藏
  const [navVisible, setNavVisible] = useState(true);
  const navHideTimerRef = useRef<number | null>(null);
  const NAV_HIDE_DELAY = 2000;

  const resetNavTimer = useCallback(() => {
    setNavVisible(true);
    if (navHideTimerRef.current) {
      clearTimeout(navHideTimerRef.current);
    }
    navHideTimerRef.current = window.setTimeout(() => {
      setNavVisible(false);
    }, NAV_HIDE_DELAY);
  }, []);

  const handleMouseMove = useCallback(() => {
    resetNavTimer();
  }, [resetNavTimer]);

  // 标准化文件输入
  const normalizedFiles = useMemo(() => normalizeFiles(files), [files]);

  const currentFile = normalizedFiles[currentIndex];

  // 检查是否有自定义渲染器匹配当前文件
  const customRenderer = useMemo(() => {
    if (!currentFile) return null;
    return customRenderers.find(renderer => renderer.test(currentFile));
  }, [currentFile, customRenderers]);

  const fileType = currentFile ? getFileType(currentFile) : 'unsupported';

  // 自定义渲染器事件派发器：未绑定 onCustomEvent 时静默忽略
  const emitCustom = useCallback(
    (name: string, payload?: unknown) => {
      if (!currentFile) return;
      onCustomEvent?.({ name, payload, file: currentFile });
    },
    [currentFile, onCustomEvent],
  );

  // 自定义渲染器上下文：注入给 render / getToolbarGroups
  const customCtx = useMemo<CustomRendererContext>(
    () => ({
      emit: emitCustom,
      t,
      theme: resolvedTheme,
      locale,
    }),
    [emitCustom, t, resolvedTheme, locale],
  );

  // 重置状态当文件改变时
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setCurrentPage(1);
    setTotalPages(1);
    setContentNaturalWidth(0);
    setContentNaturalHeight(0);
    setNavVisible(true);
    if (navHideTimerRef.current) {
      clearTimeout(navHideTimerRef.current);
    }
  }, [currentIndex]);

  // 图片加载后默认适应窗口
  useEffect(() => {
    if (fileType === 'image' && contentNaturalWidth > 0 && contentNaturalHeight > 0 && contentRef.current) {
      const containerWidth = contentRef.current.clientWidth;
      const containerHeight = contentRef.current.clientHeight;
      const scaleX = containerWidth / contentNaturalWidth;
      const scaleY = containerHeight / contentNaturalHeight;
      const newZoom = Math.min(scaleX, scaleY);
      setZoom(Math.max(0.01, Math.min(10, newZoom)));
    }
  }, [fileType, contentNaturalWidth, contentNaturalHeight]);

  // 导航箭头自动隐藏计时器启动 & 清理
  useEffect(() => {
    if (normalizedFiles.length > 1) {
      resetNavTimer();
    }
    return () => {
      if (navHideTimerRef.current) {
        clearTimeout(navHideTimerRef.current);
      }
    };
  }, [normalizedFiles.length, resetNavTimer]);

  // 键盘导航
  // - modal 模式:全局监听(window)
  // - embed 模式:只在根容器 focus 时监听,避免影响外部页面交互
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode === 'modal') {
        onClose?.();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate?.(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < normalizedFiles.length - 1) {
        onNavigate?.(currentIndex + 1);
      }
    };

    if (mode === 'modal') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    } else {
      const el = rootRef.current;
      if (!el) return;
      el.addEventListener('keydown', handleKeyDown as EventListener);
      return () => el.removeEventListener('keydown', handleKeyDown as EventListener);
    }
  }, [mode, currentIndex, normalizedFiles.length, onClose, onNavigate]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.1, 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.1, 0.01));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => prev + 90);
  }, []);

  const handleRotateLeft = useCallback(() => {
    setRotation((prev) => prev - 90);
  }, []);

  const handleFitToWidth = useCallback(() => {
    if (contentRef.current && contentNaturalWidth > 0 && contentNaturalHeight > 0) {
      const containerWidth = contentRef.current.clientWidth;
      const containerHeight = contentRef.current.clientHeight;
      const scaleX = containerWidth / contentNaturalWidth;
      const scaleY = containerHeight / contentNaturalHeight;
      const newZoom = Math.min(scaleX, scaleY);
      setZoom(Math.max(0.01, Math.min(10, newZoom)));
    } else {
      setZoom(1);
    }
    setRotation(0);
    setImageResetKey(k => k + 1);
  }, [contentNaturalWidth, contentNaturalHeight]);

  const handleOriginalSize = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setImageResetKey(k => k + 1);
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setImageResetKey(k => k + 1);
  }, []);

  const handleDownload = useCallback(() => {
    if (!currentFile) return;
    const link = document.createElement('a');
    link.href = currentFile.url;
    link.download = currentFile.name;
    link.click();
  }, [currentFile]);

  const handleEpubChapterChange = useCallback((current: number, total: number) => {
    setEpubCurrent(current);
    setEpubTotal(total);
  }, []);

  const handleMobiChapterChange = useCallback((current: number, total: number) => {
    setMobiCurrent(current);
    setMobiTotal(total);
  }, []);

  const handleZipStatsChange = useCallback((stats: ZipToolbarStats | null) => {
    setZipStats(stats);
  }, []);

  if (!currentFile) return null;

  const showCloseButton = mode === 'modal' && !!onClose;

  // 工具栏配置 — 各 Renderer 自行声明。命中自定义渲染器时优先使用其 getToolbarGroups
  const toolGroups: ToolbarGroup[] = (() => {
    if (customRenderer) {
      return customRenderer.getToolbarGroups?.(currentFile, customCtx) ?? [];
    }
    if (fileType === 'image') {
      return getImageToolbarGroups({
        zoom,
        onZoomIn: handleZoomIn,
        onZoomOut: handleZoomOut,
        onFitToWidth: handleFitToWidth,
        onOriginalSize: handleOriginalSize,
        onRotateLeft: handleRotateLeft,
        onRotateRight: handleRotate,
        onReset: handleReset,
        t,
      });
    }
    if (fileType === 'pdf') {
      return getPdfToolbarGroups({
        zoom,
        onZoomIn: handleZoomIn,
        onZoomOut: handleZoomOut,
        onReset: handleReset,
        t,
      });
    }
    if (fileType === 'epub') {
      return getEpubToolbarGroups({
        epubRef,
        current: epubCurrent,
        total: epubTotal,
        fullWidth: epubFullWidth,
        t,
      });
    }
    if (fileType === 'mobi') {
      return getMobiToolbarGroups({
        mobiRef,
        current: mobiCurrent,
        total: mobiTotal,
        fullWidth: mobiFullWidth,
        t,
      });
    }
    if (fileType === 'zip') {
      return getZipToolbarGroups({ stats: zipStats, t });
    }
    if (fileType === 'text') {
      const ext = currentFile.name.split('.').pop()?.toLowerCase() || '';
      return getTextToolbarGroups({
        wordWrap: textWordWrap,
        onToggleWrap: () => setTextWordWrap(prev => !prev),
        isHtml: ext === 'html' || ext === 'htm',
        htmlPreview: textHtmlPreview,
        onToggleHtmlPreview: () => setTextHtmlPreview(prev => !prev),
        t,
      });
    }
    if (fileType === 'markdown') {
      return getMarkdownToolbarGroups({
        viewMode: markdownViewMode,
        onToggleViewMode: () => setMarkdownViewMode(prev => prev === 'preview' ? 'source' : 'preview'),
        t,
      });
    }
    return [];
  })();

  // 操作组：下载、关闭（通用，不属于任何 Renderer）
  const actionGroups: ToolbarGroup[] = [
    {
      items: [
        { type: 'button', icon: <Download className="rfp-w-4 rfp-h-4" />, tooltip: t('common.download'), action: handleDownload },
      ],
    },
    ...(showCloseButton ? [{
      items: [
        { type: 'button' as const, icon: <X className="rfp-w-4 rfp-h-4" />, tooltip: t('common.close'), action: onClose! },
      ],
    }] : []),
  ];

  const renderToolbarItems = (groups: ToolbarGroup[], dividerClass: string) =>
    groups.map((group, gi, arr) => (
      <React.Fragment key={gi}>
        {group.items.map((item, ii) =>
          item.type === 'button' ? (
            <ToolbarButton
              key={`${gi}-${ii}`}
              icon={item.icon}
              label={item.tooltip}
              onClick={item.action}
              disabled={item.disabled}
            />
          ) : (
            <span
              key={`${gi}-${ii}`}
              className="rfp-text-xs rfp-text-center rfp-font-medium rfp-tabular-nums rfp-text-fg-tertiary"
              style={{ minWidth: item.minWidth || 'auto' }}
            >
              {item.content}
            </span>
          )
        )}
        {gi < arr.length - 1 && <div className={`rfp-w-px rfp-h-4 rfp-bg-divide ${dividerClass}`} />}
      </React.Fragment>
    ));

  return (
    <LocaleProvider locale={locale} messages={userMessages}>
    <ThemeProvider theme={resolvedTheme}>
    <div
      ref={rootRef}
      tabIndex={mode === 'embed' ? 0 : -1}
      data-theme={resolvedTheme}
      className="rfp-relative rfp-w-full rfp-h-full rfp-flex rfp-flex-col rfp-overflow-hidden rfp-outline-none"
    >
      {/* 顶部工具栏 - 全屏融合式 */}
      {!headless && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="rfp-flex-shrink-0 rfp-z-10 rfp-backdrop-blur-md rfp-border-b rfp-bg-surface-toolbar rfp-border-line"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* 第一行:文件名 + 分页 + 关闭/下载(移动端右侧)/ 全部按钮(桌面端) */}
        <div className="rfp-flex rfp-items-center rfp-justify-between rfp-px-3 md:rfp-px-5 rfp-py-1.5 md:rfp-py-2.5">
          {/* 左侧:文件名 + 分页 */}
          <div className="rfp-flex rfp-items-center rfp-flex-1 rfp-min-w-0 rfp-mr-2 md:rfp-mr-3">
            <h2 className="rfp-font-medium rfp-text-xs md:rfp-text-sm rfp-truncate rfp-text-fg-primary">
              {currentFile.name}
            </h2>
            <span className="rfp-text-xs rfp-ml-2 rfp-flex-shrink-0 rfp-text-fg-muted">
              {currentIndex + 1}/{normalizedFiles.length}
            </span>
          </div>

          {/* 移动端:仅显示下载+关闭 */}
          <div className="rfp-flex rfp-items-center rfp-gap-1 md:rfp-hidden rfp-flex-shrink-0">
            {renderToolbarItems(actionGroups, 'rfp-mx-0.5')}
          </div>

          {/* 桌面端:所有工具按钮 */}
          <div className="rfp-hidden md:rfp-flex rfp-items-center rfp-gap-1 rfp-flex-shrink-0">
            {renderToolbarItems(toolGroups, 'rfp-mx-1')}
            {toolGroups.length > 0 && <div className="rfp-w-px rfp-h-4 rfp-mx-1 rfp-bg-divide" />}
            {renderToolbarItems(actionGroups, 'rfp-mx-1')}
          </div>
        </div>

        {/* 第二行:移动端工具按钮(image/pdf/epub) */}
        {toolGroups.length > 0 && (
          <div className="rfp-flex rfp-items-center rfp-gap-1 rfp-px-3 rfp-pb-1.5 rfp-overflow-x-auto scrollbar-hide md:rfp-hidden">
            {renderToolbarItems(toolGroups, 'rfp-mx-0.5')}
          </div>
        )}
      </motion.div>
      )}

      {/* 内容区域 */}
      <div
        ref={contentRef}
        className="rfp-flex-1 rfp-flex rfp-items-center rfp-justify-center rfp-overflow-auto"
        onMouseMove={handleMouseMove}
      >
        {customRenderer ? (
          customRenderer.render(currentFile, customCtx)
        ) : (
          <>
            {fileType === 'image' && (
              <ImageRenderer
                url={currentFile.url}
                zoom={zoom}
                rotation={rotation}
                resetKey={imageResetKey}
                fileSize={currentFile.size}
                onZoomChange={handleZoomChange}
                onNaturalWidthChange={setContentNaturalWidth}
                onNaturalHeightChange={setContentNaturalHeight}
              />
            )}
            {fileType === 'pdf' && (
              <PdfRenderer
                url={currentFile.url}
                zoom={zoom}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onTotalPagesChange={setTotalPages}
                onPageWidthChange={setContentNaturalWidth}
              />
            )}
            {fileType === 'docx' && <DocxRenderer url={currentFile.url} />}
            {fileType === 'xlsx' && <XlsxRenderer url={currentFile.url} />}
            {fileType === 'pptx' && <PptxRenderer url={currentFile.url} />}
            {fileType === 'msg' && <MsgRenderer url={currentFile.url} />}
            {fileType === 'epub' && (
              <EpubRenderer
                ref={epubRef}
                url={currentFile.url}
                onChapterChange={handleEpubChapterChange}
                onFullWidthChange={setEpubFullWidth}
              />
            )}
            {fileType === 'mobi' && (
              <MobiRenderer
                ref={mobiRef}
                url={currentFile.url}
                onChapterChange={handleMobiChapterChange}
                onFullWidthChange={setMobiFullWidth}
              />
            )}
            {fileType === 'video' && <VideoRenderer url={currentFile.url} />}
            {fileType === 'audio' && (
              <AudioRenderer url={currentFile.url} fileName={currentFile.name} />
            )}
            {fileType === 'markdown' && <MarkdownRenderer url={currentFile.url} viewMode={markdownViewMode} />}
            {fileType === 'json' && (
              <JsonRenderer url={currentFile.url} fileName={currentFile.name} />
            )}
            {fileType === 'csv' && (
              <CsvRenderer url={currentFile.url} fileName={currentFile.name} />
            )}
            {fileType === 'xml' && (
              <XmlRenderer url={currentFile.url} fileName={currentFile.name} />
            )}
            {fileType === 'subtitle' && (
              <SubtitleRenderer url={currentFile.url} fileName={currentFile.name} />
            )}
            {fileType === 'zip' && (
              zipNestingDepth >= MAX_ZIP_NESTING_DEPTH ? (
                <UnsupportedRenderer
                  fileName={currentFile.name}
                  fileType={currentFile.type}
                  onDownload={handleDownload}
                />
              ) : (
                <ZipRenderer url={currentFile.url} onStatsChange={handleZipStatsChange} nestingDepth={zipNestingDepth} />
              )
            )}
            {fileType === 'text' && (
              <TextRenderer
                url={currentFile.url}
                fileName={currentFile.name}
                wordWrap={textWordWrap}
                htmlPreview={textHtmlPreview}
              />
            )}
            {fileType === 'unsupported' && (
              <UnsupportedRenderer
                fileName={currentFile.name}
                fileType={currentFile.type}
                onDownload={handleDownload}
              />
            )}
          </>
        )}
      </div>

      {/* 左右导航箭头 - 自动隐藏 */}
      {!headless && normalizedFiles.length > 1 && (
        <>
          {currentIndex > 0 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: navVisible ? 1 : 0, x: navVisible ? 0 : -20 }}
              transition={{ duration: 0.2 }}
              onClick={() => onNavigate?.(currentIndex - 1)}
              onMouseEnter={() => setNavVisible(true)}
              style={{ pointerEvents: navVisible ? 'auto' : 'none' }}
              className="rfp-absolute rfp-z-20 rfp-left-2 md:rfp-left-4 rfp-top-1/2 -rfp-translate-y-1/2 rfp-w-10 rfp-h-10 md:rfp-w-12 md:rfp-h-12 rfp-rounded-full rfp-backdrop-blur-xl rfp-border rfp-flex rfp-items-center rfp-justify-center rfp-transition-colors rfp-shadow-2xl rfp-bg-surface-nav rfp-border-line hover:rfp-bg-surface-nav-hover rfp-text-fg-primary"
            >
              <ChevronLeft className="rfp-w-5 rfp-h-5 md:rfp-w-6 md:rfp-h-6" />
            </motion.button>
          )}

          {currentIndex < normalizedFiles.length - 1 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: navVisible ? 1 : 0, x: navVisible ? 0 : 20 }}
              transition={{ duration: 0.2 }}
              onClick={() => onNavigate?.(currentIndex + 1)}
              onMouseEnter={() => setNavVisible(true)}
              style={{ pointerEvents: navVisible ? 'auto' : 'none' }}
              className="rfp-absolute rfp-z-20 rfp-right-2 md:rfp-right-4 rfp-top-1/2 -rfp-translate-y-1/2 rfp-w-10 rfp-h-10 md:rfp-w-12 md:rfp-h-12 rfp-rounded-full rfp-backdrop-blur-xl rfp-border rfp-flex rfp-items-center rfp-justify-center rfp-transition-colors rfp-shadow-2xl rfp-bg-surface-nav rfp-border-line hover:rfp-bg-surface-nav-hover rfp-text-fg-primary"
            >
              <ChevronRight className="rfp-w-5 rfp-h-5 md:rfp-w-6 md:rfp-h-6" />
            </motion.button>
          )}
        </>
      )}
    </div>
    </ThemeProvider>
    </LocaleProvider>
  );
};

// 工具栏按钮组件
interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon, label, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rfp-relative rfp-group rfp-p-2 md:rfp-p-1.5 rfp-rounded-md rfp-transition-all rfp-select-none ${
        disabled
          ? 'rfp-text-fg-disabled rfp-cursor-not-allowed'
          : 'rfp-text-fg-primary hover:rfp-bg-surface-2 active:rfp-bg-surface-3'
      }`}
    >
      {icon}
      <span className="rfp-absolute rfp-left-1/2 -rfp-translate-x-1/2 rfp-top-full rfp-mt-1.5 rfp-px-2 rfp-py-1 rfp-text-xs rfp-rounded rfp-whitespace-nowrap rfp-pointer-events-none rfp-opacity-0 rfp-invisible group-hover:rfp-opacity-100 group-hover:rfp-visible rfp-transition-opacity rfp-duration-200 rfp-z-50 rfp-bg-fg-primary rfp-text-fg-inverse">
        <span className="rfp-absolute rfp-left-1/2 -rfp-translate-x-1/2 -rfp-top-1 rfp-w-2 rfp-h-2 rfp-rotate-45 rfp-bg-fg-primary" />
        <span className="rfp-relative">{label}</span>
      </span>
    </button>
  );
};
