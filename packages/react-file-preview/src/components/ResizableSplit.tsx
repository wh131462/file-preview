import React, { useEffect, useRef, useState, useCallback } from 'react';

export interface ResizableSplitProps {
  /** 左侧内容 */
  left: React.ReactNode;
  /** 右侧内容 */
  right: React.ReactNode;
  /** 左侧初始宽度（px）；传入 storageKey 时会从 localStorage 读取 */
  initialLeftWidth?: number;
  /** 左侧最小宽度（px） */
  minLeftWidth?: number;
  /** 左侧最大宽度（px），同时不超过 `容器宽 - minRightWidth - 分隔线宽` */
  maxLeftWidth?: number;
  /** 右侧至少保留的宽度（px） */
  minRightWidth?: number;
  /** localStorage 持久化 key；不传则不持久化 */
  storageKey?: string;
  /** 启用横向拖动的媒体查询，默认 `(min-width: 768px)` */
  desktopMedia?: string;
  /** 容器额外类名 */
  className?: string;
}

/**
 * 通用可拖动分隔布局：
 * - 桌面端（由 `desktopMedia` 判定）横向分两栏，中间分隔线可左右拖动调整左栏宽度
 * - 移动端退化为上下堆叠，不显示分隔线
 * - 可选 `storageKey` 将宽度持久化到 localStorage
 */
export const ResizableSplit: React.FC<ResizableSplitProps> = ({
  left,
  right,
  initialLeftWidth = 280,
  minLeftWidth = 160,
  maxLeftWidth = 640,
  minRightWidth = 200,
  storageKey,
  desktopMedia = '(min-width: 768px)',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = Number(window.localStorage.getItem(storageKey));
      if (!isNaN(saved) && saved > 0) return saved;
    }
    return initialLeftWidth;
  });
  const [dragging, setDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // 响应式：监听媒体查询
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(desktopMedia);
    const handler = () => setIsDesktop(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [desktopMedia]);

  // 拖动
  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const cap = rect.width - minRightWidth - 6;
      const effectiveMax = Math.min(maxLeftWidth, cap);
      const newW = Math.max(minLeftWidth, Math.min(effectiveMax, x));
      setLeftWidth(newW);
    };
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [dragging, minLeftWidth, maxLeftWidth, minRightWidth]);

  // 持久化
  useEffect(() => {
    if (!storageKey || dragging) return;
    try {
      window.localStorage.setItem(storageKey, String(leftWidth));
    } catch {
      // ignore
    }
  }, [leftWidth, storageKey, dragging]);

  const handleDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`rfp-w-full rfp-h-full rfp-flex rfp-flex-col md:rfp-flex-row rfp-min-h-0 rfp-min-w-0 ${className}`}
    >
      <div
        className="rfp-min-h-0 rfp-min-w-0 rfp-flex-shrink-0 rfp-w-full rfp-max-h-60 md:rfp-h-full md:rfp-max-h-none"
        style={isDesktop ? { width: `${leftWidth}px` } : undefined}
      >
        {left}
      </div>
      {/* 分隔线：仅桌面显示 */}
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={handleDividerDown}
        className={`rfp-hidden md:rfp-block rfp-relative rfp-w-1.5 rfp-flex-shrink-0 rfp-cursor-col-resize rfp-transition-colors ${
          dragging ? 'rfp-bg-white/40' : 'rfp-bg-white/10 hover:rfp-bg-white/30'
        }`}
      >
        {/* 加宽命中区，改善拖动体验 */}
        <span className="rfp-absolute rfp-inset-y-0 -rfp-left-1 -rfp-right-1" />
      </div>
      <div className="rfp-flex-1 rfp-min-w-0 rfp-min-h-0 rfp-overflow-hidden">{right}</div>
    </div>
  );
};
