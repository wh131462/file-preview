import { useEffect, useState } from 'react';
import { PreviewFileInput, CustomRenderer } from './types';
import { FilePreviewContent } from './FilePreviewContent';
import type { Locale, Messages, Theme, CustomRendererEventPayload } from '@eternalheart/file-preview-core';

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
  const isLight = resolvedTheme === 'light';

  return (
    <div
      className={`rfp-root ${className ?? ''}`}
      style={{ width, height, ...style }}
      data-theme={resolvedTheme}
    >
      <div className={`rfp-relative rfp-w-full rfp-h-full rfp-overflow-hidden ${isLight ? 'rfp-bg-gray-100' : 'rfp-bg-black/80'}`}>
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
        />
      </div>
    </div>
  );
};
