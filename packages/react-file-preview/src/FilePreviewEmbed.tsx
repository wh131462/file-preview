import { PreviewFileInput, CustomRenderer } from './types';
import { FilePreviewContent } from './FilePreviewContent';
import type { Locale, Messages } from '@eternalheart/file-preview-core';

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
}) => {
  return (
    <div
      className={`rfp-root ${className ?? ''}`}
      style={{ width, height, ...style }}
    >
      <div className="rfp-relative rfp-w-full rfp-h-full rfp-overflow-hidden rfp-bg-black/80">
        <FilePreviewContent
          mode="embed"
          files={files}
          currentIndex={currentIndex}
          onNavigate={onNavigate}
          customRenderers={customRenderers}
          locale={locale}
          messages={messages}
        />
      </div>
    </div>
  );
};
