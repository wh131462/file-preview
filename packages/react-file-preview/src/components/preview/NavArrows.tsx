import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Translator } from '@eternalheart/file-preview-core';

export interface NavArrowsProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  resetKey: number;
  t: Translator;
}

const NAV_HIDE_DELAY = 2000;

/**
 * 导航箭头组件
 * 自带 mousemove 监听 + 2s 自动隐藏定时器
 * state 隔离在本组件，避免父组件因 navVisible 变化而 re-render
 */
export const NavArrows: React.FC<NavArrowsProps> = ({
  containerRef,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  resetKey,
  t,
}) => {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<number | null>(null);

  const scheduleHide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setVisible(false), NAV_HIDE_DELAY);
  }, []);

  const show = useCallback(() => {
    setVisible((prev) => (prev ? prev : true));
    scheduleHide();
  }, [scheduleHide]);

  // 监听容器的 mousemove，触发显示 + 重置隐藏定时器
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => show();
    el.addEventListener('mousemove', handler);
    return () => {
      el.removeEventListener('mousemove', handler);
    };
  }, [containerRef, show]);

  // currentIndex 切换时，显示一次并重置定时器
  useEffect(() => {
    setVisible(true);
    scheduleHide();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetKey, scheduleHide]);

  return (
    <>
      {hasPrev && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -20 }}
          transition={{ duration: 0.2 }}
          onClick={onPrev}
          onMouseEnter={show}
          style={{ pointerEvents: visible ? 'auto' : 'none' }}
          aria-label={t('accessibility.previousFile') || '上一个文件'}
          aria-keyshortcuts="ArrowLeft"
          className="rfp-absolute rfp-z-20 rfp-left-2 md:rfp-left-4 rfp-top-1/2 -rfp-translate-y-1/2 rfp-w-10 rfp-h-10 md:rfp-w-12 md:rfp-h-12 rfp-rounded-full rfp-backdrop-blur-xl rfp-border rfp-flex rfp-items-center rfp-justify-center rfp-transition-colors rfp-shadow-2xl rfp-bg-surface-nav rfp-border-line hover:rfp-bg-surface-nav-hover rfp-text-fg-primary"
        >
          <ChevronLeft className="rfp-w-5 rfp-h-5 md:rfp-w-6 md:rfp-h-6" />
        </motion.button>
      )}
      {hasNext && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : 20 }}
          transition={{ duration: 0.2 }}
          onClick={onNext}
          onMouseEnter={show}
          style={{ pointerEvents: visible ? 'auto' : 'none' }}
          aria-label={t('accessibility.nextFile') || '下一个文件'}
          aria-keyshortcuts="ArrowRight"
          className="rfp-absolute rfp-z-20 rfp-right-2 md:rfp-right-4 rfp-top-1/2 -rfp-translate-y-1/2 rfp-w-10 rfp-h-10 md:rfp-w-12 md:rfp-h-12 rfp-rounded-full rfp-backdrop-blur-xl rfp-border rfp-flex rfp-items-center rfp-justify-center rfp-transition-colors rfp-shadow-2xl rfp-bg-surface-nav rfp-border-line hover:rfp-bg-surface-nav-hover rfp-text-fg-primary"
        >
          <ChevronRight className="rfp-w-5 rfp-h-5 md:rfp-w-6 md:rfp-h-6" />
        </motion.button>
      )}
    </>
  );
};
