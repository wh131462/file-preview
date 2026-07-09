import { useEffect, useState } from 'react';
import { PreviewFileInput, CustomRenderer } from './types';
import { FilePreviewContent } from './FilePreviewContent';
import type { Locale, Messages, Theme, CustomRendererEventPayload, PreviewFile, RequestHandler, RequestInitFactory, ShouldFetchAsBlob } from '@eternalheart/file-preview-core';

interface FilePreviewEmbedProps {
  files: PreviewFileInput[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
  customRenderers?: CustomRenderer[];
  /** 宽度,默认 100% 填充父容器 */
  width?: number | string;
  /** 高度,默认 100% 填充父容器 */
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  /** 国际化语言，默认 'zh-CN' */
  locale?: Locale;
  /** 用户自定义翻译字典 */
  messages?: Partial<Record<Locale, Partial<Messages>>>;
  /** 无头模式：隐藏工具栏和导航箭头 */
  headless?: boolean;
  /** 主题模式，默认 'dark' */
  theme?: Theme;
  /** 自定义渲染器派发的事件出口 */
  onCustomEvent?: (event: CustomRendererEventPayload) => void;
  /** 自定义 RequestInit（或工厂函数）：注入 Authorization 等鉴权头 */
  requestInit?: RequestInitFactory;
  /** 自定义请求处理器：完全接管库内 fetch */
  requestHandler?: RequestHandler;
  /** 返回 true 时，对应文件先 fetcher→blob URL 后喂给 image/video/audio/pdf 等 renderer */
  shouldFetchAsBlob?: ShouldFetchAsBlob;
  /** 自定义下载回调；不传时库内默认通过 fetcher 拉 Blob 触发下载 */
  onDownload?: (file: PreviewFile) => void | Promise<void>;
  /** 关闭回调 */
  onClose?: () => void;
  /** 是否显示关闭按钮，默认根据 mode 决定（embed: false） */
  showClose?: boolean;
  /** 是否显示下载按钮，默认 true */
  showDownload?: boolean;
}

export const FilePreviewEmbed: React.FC<FilePreviewEmbedProps> = ({
  files,
  currentIndex = 0,
  onNavigate,
  customRenderers = [],
  width = '100%',
  height = '100%',
  className,
  style,
  locale,
  messages,
  headless,
  theme = 'dark',
  onCustomEvent,
  requestInit,
  requestHandler,
  shouldFetchAsBlob,
  onDownload,
  onClose,
  showClose,
  showDownload,
}) => {
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

  return (
    <div
      className={`rfp-root ${className ?? ''}`}
      style={{ width, height, ...style }}
      data-theme={resolvedTheme}
    >
      <div className="rfp-relative rfp-w-full rfp-h-full rfp-overflow-hidden rfp-bg-surface-overlay">
        <FilePreviewContent
          mode="embed"
          files={files}
          currentIndex={currentIndex}
          onNavigate={onNavigate}
          customRenderers={customRenderers}
          locale={locale}
          messages={messages}
          headless={headless}
          theme={theme}
          onCustomEvent={onCustomEvent}
          requestInit={requestInit}
          requestHandler={requestHandler}
          shouldFetchAsBlob={shouldFetchAsBlob}
          onDownload={onDownload}
          onClose={onClose}
          showClose={showClose}
          showDownload={showDownload}
        />
      </div>
    </div>
  );
};
