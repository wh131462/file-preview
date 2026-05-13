import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PreviewFileInput, CustomRenderer } from './types';
import { FilePreviewContent } from './FilePreviewContent';
import type { Locale, Messages, Theme, CustomRendererEventPayload } from '@eternalheart/file-preview-core';

interface FilePreviewModalProps {
  files: PreviewFileInput[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (index: number) => void;
  customRenderers?: CustomRenderer[];
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

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  files,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  customRenderers = [],
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

  // 锁定 body 滚动
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="rfp-root" data-theme={resolvedTheme}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`rfp-fixed rfp-inset-0 rfp-z-[9999] rfp-flex rfp-items-center rfp-justify-center rfp-backdrop-blur-md rfp-overflow-hidden ${isLight ? 'rfp-bg-white/60' : 'rfp-bg-black/80'}`}
            onClick={onClose}
            onWheel={(e) => e.stopPropagation()}
          >
            <div
              className="rfp-relative rfp-w-full rfp-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <FilePreviewContent
                mode="modal"
                files={files}
                currentIndex={currentIndex}
                onClose={onClose}
                onNavigate={onNavigate}
                customRenderers={customRenderers}
                locale={locale}
                messages={messages}
                headless={headless}
                theme={theme}
                onCustomEvent={onCustomEvent}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(modalContent, document.body);
};
