import { PreviewFileInput, CustomRenderer } from './types';
import { FilePreviewContent } from './FilePreviewContent';
import type { PreviewErrorHandler } from './FilePreviewContent';
import { useThemeMode } from './hooks';
import type { EmptyHintMode, Locale, Messages, Theme, CustomRendererEventPayload, PreviewFile, RequestHandler, RequestInitFactory, ShouldFetchAsBlob, FileLoader } from '@eternalheart/file-preview-core';

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
  /** 国际化语言，默认 'en-US' */
  locale?: Locale;
  /** 用户自定义翻译字典 */
  messages?: Partial<Record<Locale, Partial<Messages>>>;
  /** 无头模式：隐藏工具栏和导航箭头 */
  headless?: boolean;
  /** 主题模式，默认 'dark' */
  theme?: Theme;
  /** 自定义渲染器派发的事件出口 */
  onCustomEvent?: (event: CustomRendererEventPayload) => void;
  /** 统一取数入口：鉴权 / 签名场景下由宿主决定文件怎么取 */
  loadFile?: FileLoader;
  /** @deprecated 将在 1.8.0 移除；请改用 `loadFile` */
  requestInit?: RequestInitFactory;
  /** @deprecated 将在 1.8.0 移除；请改用 `loadFile` */
  requestHandler?: RequestHandler;
  /** @deprecated 将在 1.8.0 移除；请改用 `loadFile` */
  shouldFetchAsBlob?: ShouldFetchAsBlob;
  /** 自定义下载回调；不传时库内默认通过 fetcher 拉 Blob 触发下载 */
  onDownload?: (file: PreviewFile) => void | Promise<void>;
  /** 关闭回调 */
  onClose?: () => void;
  /** 是否显示关闭按钮，默认根据 mode 决定（embed: false） */
  showClose?: boolean;
  /** 是否显示下载按钮，默认 true */
  showDownload?: boolean;
  /** 是否显示文件导航箭头，默认 true */
  showNavigation?: boolean;
  /** 是否循环导航文件，默认 false */
  loopNavigation?: boolean;
  /** 空内容提示策略，默认 'auto'（文本类空白、结构化类型提示） */
  emptyHint?: EmptyHintMode;
  /** 加载/渲染失败回调：每次加载最多触发一次，payload 已补全 file/index/stage（兼容旧版渲染错误签名） */
  onError?: PreviewErrorHandler;
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
  loadFile,
  requestInit,
  requestHandler,
  shouldFetchAsBlob,
  onDownload,
  onClose,
  showClose,
  showDownload,
  showNavigation,
  loopNavigation,
  emptyHint,
  onError,
}) => {
  const resolvedTheme = useThemeMode(theme);

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
          loadFile={loadFile}
          requestInit={requestInit}
          requestHandler={requestHandler}
          shouldFetchAsBlob={shouldFetchAsBlob}
          onDownload={onDownload}
          onError={onError}
          onClose={onClose}
          showClose={showClose}
          showDownload={showDownload}
          showNavigation={showNavigation}
          loopNavigation={loopNavigation}
          emptyHint={emptyHint}
        />
      </div>
    </div>
  );
};
