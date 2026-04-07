import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ImageRendererProps {
  url: string;
  zoom: number;
  rotation: number;
  resetKey?: number;
  fileSize?: number;
  onZoomChange?: (zoom: number) => void;
  onNaturalWidthChange?: (width: number) => void;
  onNaturalHeightChange?: (height: number) => void;
}

export const ImageRenderer: React.FC<ImageRendererProps> = ({
  url,
  zoom,
  rotation,
  resetKey,
  fileSize,
  onZoomChange,
  onNaturalWidthChange,
  onNaturalHeightChange
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [internalZoom, setInternalZoom] = useState(1);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoaded(false);
    setError(null);
    setPosition({ x: 0, y: 0 });
    setInternalZoom(1);
  }, [url]);

  // 当外部 zoom 改变时,同步内部 zoom
  useEffect(() => {
    setInternalZoom(zoom);
  }, [zoom]);

  // 适应窗口/原始尺寸等操作时重置位置居中
  useEffect(() => {
    if (resetKey !== undefined) {
      setPosition({ x: 0, y: 0 });
    }
  }, [resetKey]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true);
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    onNaturalWidthChange?.(img.naturalWidth);
    onNaturalHeightChange?.(img.naturalHeight);
  };

  // 边界限制：确保图片至少有一部分可见
  const clampPosition = useCallback((pos: { x: number; y: number }, currentZoom: number) => {
    const container = containerRef.current;
    if (!container || naturalSize.width === 0) return pos;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const imgW = naturalSize.width * currentZoom;
    const imgH = naturalSize.height * currentZoom;

    // 至少保留 margin px 的图片在视口内
    const margin = Math.min(80, containerW * 0.15, containerH * 0.15);
    const rangeX = (containerW + imgW) / 2 - margin;
    const rangeY = (containerH + imgH) / 2 - margin;

    return {
      x: rangeX > 0 ? Math.max(-rangeX, Math.min(rangeX, pos.x)) : 0,
      y: rangeY > 0 ? Math.max(-rangeY, Math.min(rangeY, pos.y)) : 0,
    };
  }, [naturalSize]);

  const handleError = () => {
    setError('图片加载失败');
    setLoaded(true);
  };

  // 双击复原：居中 + 缩放100%
  const handleDoubleClick = () => {
    setPosition({ x: 0, y: 0 });
    setInternalZoom(1);
    onZoomChange?.(1);
  };

  // 鼠标滚轮缩放 —— 以鼠标位置为缩放原点
  // 使用原生事件 + passive: false,确保 preventDefault 生效,
  // 避免滚轮事件冒泡触发外层(如嵌入模式下的页面滚动)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;

      const delta = e.deltaY > 0 ? -0.05 : 0.05;

      setInternalZoom(prev => {
        const newZoom = Math.max(0.01, Math.min(10, prev + delta));
        const scale = newZoom / prev;

        setPosition(pos => clampPosition({
          x: mouseX - scale * (mouseX - pos.x),
          y: mouseY - scale * (mouseY - pos.y),
        }, newZoom));

        onZoomChange?.(newZoom);
        return newZoom;
      });
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelNative);
  }, [onZoomChange, clampPosition]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition(clampPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }, internalZoom));
  }, [isDragging, dragStart, internalZoom, clampPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="rfp-relative rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full rfp-overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {!loaded && !error && (
        <div className="rfp-flex rfp-items-center rfp-justify-center">
          <div className="rfp-w-12 rfp-h-12 rfp-border-4 rfp-border-white/20 rfp-border-t-white rfp-rounded-full rfp-animate-spin" />
        </div>
      )}

      {error && (
        <div className="rfp-text-white/70 rfp-text-center">
          <p className="rfp-text-lg">{error}</p>
        </div>
      )}

      <motion.img
        ref={imgRef}
        src={url}
        alt="Preview"
        className={`rfp-max-w-none rfp-select-none ${!loaded ? 'rfp-hidden' : ''}`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${internalZoom}) rotate(${rotation}deg)`,
          transformOrigin: 'center',
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
        onLoad={handleLoad}
        onError={handleError}
        onDoubleClick={handleDoubleClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        draggable={false}
      />

      {/* 右下角分辨率 */}
      {loaded && !error && naturalSize.width > 0 && (
        <div className="rfp-absolute rfp-bottom-2 rfp-right-3 rfp-text-[10px] rfp-text-white/30 hover:rfp-text-white/80 rfp-transition-colors rfp-pointer-events-auto rfp-select-none rfp-cursor-default">
          {naturalSize.width} × {naturalSize.height}{fileSize != null && ` · ${fileSize < 1024 ? `${fileSize} B` : fileSize < 1024 * 1024 ? `${(fileSize / 1024).toFixed(1)} KB` : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`}`}
        </div>
      )}
    </div>
  );
};
