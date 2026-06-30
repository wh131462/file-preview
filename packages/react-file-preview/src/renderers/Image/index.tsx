import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ZoomIn, ZoomOut, RotateCw, RotateCcw, Scan, RefreshCw } from 'lucide-react';
import { useTranslator } from '../../i18n/LocaleContext';
import { detectImageFormat, getLoaderForMimeType } from '@eternalheart/file-preview-core';
import type { PreviewFile } from '@eternalheart/file-preview-core';
import { RendererError } from '../RendererError';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

const OriginalSizeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <text x="12" y="17.5" textAnchor="middle" fontSize="20" fontWeight="bold" fill="currentColor" stroke="none">
      1:1
    </text>
  </svg>
);

export interface ImageRendererHandle extends RendererHandle {
  fitToWidth: () => void;
  resetView: () => void;
}

interface ImageRendererProps {
  url: string;
  fileSize?: number;
  file?: PreviewFile | File;
}

export const ImageRenderer = forwardRef<ImageRendererHandle, ImageRendererProps>(({
  url,
  fileSize,
  file,
}, ref) => {
  const t = useTranslator();

  // 内部状态管理
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [decodeProgress, setDecodeProgress] = useState(0);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const fileBlobRef = useRef<Blob | null>(null);
  const loaderRef = useRef<any>(null);
  const pageCacheRef = useRef<Map<number, string>>(new Map());
  const isTouchDevice = useRef(false);
  const touchStartDistance = useRef(0);
  const touchStartZoom = useRef(1);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const lastTapTime = useRef(0);

  // 事件发射器：用于通知主组件工具栏状态变化
  const listenersRef = useRef<Set<() => void>>(new Set());
  const notifyToolbarChange = useCallback(() => {
    listenersRef.current.forEach(listener => listener());
  }, []);

  // 监听影响工具栏的状态变化
  useEffect(() => {
    notifyToolbarChange();
  }, [zoom, notifyToolbarChange]);

  useEffect(() => {
    notifyToolbarChange();
  }, [rotation, notifyToolbarChange]);

  // 解码逻辑：检测格式并按需解码
  useEffect(() => {
    let cancelled = false;

    const decodeIfNeeded = async () => {
      // 重置状态：清空 src 以避免上一张图片的 onLoad/onError 误触发到新文件
      setImageSrc('');
      setLoaded(false);
      setError(null);
      setDecoding(false);
      setDecodeError(null);
      setDecodeProgress(0);
      setPosition({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCurrentPage(1);
      setTotalPages(1);

      // 清理旧的 blob URL 与缓存
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      pageCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      pageCacheRef.current.clear();
      fileBlobRef.current = null;
      loaderRef.current = null;

      // 如果没有 file 对象，直接使用 url
      if (!file) {
        if (!cancelled) setImageSrc(url);
        return;
      }

      try {
        // 检测图片格式
        const mimeType = await detectImageFormat(file);
        const loader = await getLoaderForMimeType(mimeType);

        // 如果不需要解码，直接使用原 URL
        if (!loader || !(await loader.needsDecode(mimeType))) {
          if (!cancelled) setImageSrc(url);
          return;
        }

        // 需要解码
        setDecoding(true);

        // 获取文件 Blob
        let fileBlob: Blob;
        if (file instanceof Blob) {
          fileBlob = file;
        } else {
          const response = await fetch(url);
          if (!response.ok) throw new Error('Failed to fetch file');
          fileBlob = await response.blob();
        }

        if (cancelled) return;

        // 缓存 Blob 与 loader 以便后续翻页
        fileBlobRef.current = fileBlob;
        loaderRef.current = loader;

        // 缓存 Blob 与 loader 以便后续翻页
        fileBlobRef.current = fileBlob;
        loaderRef.current = loader;

        // 获取元数据（用于检测多页 TIFF）
        if (loader.getMetadata) {
          try {
            const metadata = await loader.getMetadata(fileBlob);
            if (!cancelled && metadata.pageCount && metadata.pageCount > 1) {
              setTotalPages(metadata.pageCount);
            }
          } catch {
            // 忽略元数据获取失败
          }
        }

        // 调用 loader 解码（第 1 页 / 缩略图模式）
        const decodedBlob = await loader.decode(fileBlob, {
          page: 1,
          fullQuality: false,
          onProgress: (percent: number) => {
            if (!cancelled) {
              setDecodeProgress(percent);
            }
          },
        });

        if (cancelled) return;

        // 生成 blob URL
        const blobUrl = typeof decodedBlob === 'string'
          ? decodedBlob
          : URL.createObjectURL(decodedBlob);

        blobUrlRef.current = blobUrl;
        pageCacheRef.current.set(1, blobUrl);
        setImageSrc(blobUrl);
        setDecoding(false);
      } catch (err: any) {
        if (!cancelled) {
          setDecodeError(err?.message || '解码失败');
          setDecoding(false);
        }
      }
    };

    decodeIfNeeded();

    return () => {
      cancelled = true;
    };
  }, [url, file]);

  // 多页 TIFF 翻页：切换页码时重新解码
  const handlePageChange = useCallback(async (page: number) => {
    if (!fileBlobRef.current || !loaderRef.current) return;
    if (page < 1 || page > totalPages) return;

    // 命中缓存：直接切换
    const cached = pageCacheRef.current.get(page);
    if (cached) {
      setCurrentPage(page);
      setImageSrc(cached);
      return;
    }

    // 解码新页面
    setDecoding(true);
    try {
      const decodedBlob = await loaderRef.current.decode(fileBlobRef.current, { page });
      const blobUrl = typeof decodedBlob === 'string'
        ? decodedBlob
        : URL.createObjectURL(decodedBlob);

      // LRU：缓存超过 10 页时删除最早的
      if (pageCacheRef.current.size >= 10) {
        const firstKey = pageCacheRef.current.keys().next().value;
        if (firstKey !== undefined) {
          const oldUrl = pageCacheRef.current.get(firstKey);
          if (oldUrl) URL.revokeObjectURL(oldUrl);
          pageCacheRef.current.delete(firstKey);
        }
      }

      pageCacheRef.current.set(page, blobUrl);
      setCurrentPage(page);
      setImageSrc(blobUrl);
      setDecoding(false);
    } catch (err: any) {
      setDecodeError(err?.message || '翻页解码失败');
      setDecoding(false);
    }
  }, [totalPages]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      pageCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      pageCacheRef.current.clear();
    };
  }, []);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true);
    const img = e.currentTarget;
    const newNaturalSize = { width: img.naturalWidth, height: img.naturalHeight };
    setNaturalSize(newNaturalSize);

    // 图片加载完成后，自动适应窗口大小
    if (containerRef.current && newNaturalSize.width > 0 && newNaturalSize.height > 0) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const scaleX = containerWidth / newNaturalSize.width;
      const scaleY = containerHeight / newNaturalSize.height;
      const newZoom = Math.min(scaleX, scaleY);
      setZoom(Math.max(0.01, Math.min(10, newZoom)));
      setPosition({ x: 0, y: 0 });
    }
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
    setError(t('image.load_failed'));
    setLoaded(true);
  };

  // 双击复原：居中 + 缩放100%
  const handleDoubleClick = () => {
    setPosition({ x: 0, y: 0 });
    setZoom(1);
  };

  // 触屏事件处理
  const handleTouchStart = useCallback((e: TouchEvent) => {
    isTouchDevice.current = true;
    e.preventDefault();

    const touches = e.touches;
    if (touches.length === 1) {
      // 单指拖拽
      setIsDragging(true);
      setDragStart({
        x: touches[0].clientX - position.x,
        y: touches[0].clientY - position.y,
      });

      // 双击检测
      const now = Date.now();
      if (now - lastTapTime.current < 300) {
        // 双击复原：居中 + 缩放100%
        setPosition({ x: 0, y: 0 });
        setZoom(1);
      }
      lastTapTime.current = now;
    } else if (touches.length === 2) {
      // 双指缩放初始化
      setIsDragging(false);
      const distance = Math.hypot(
        touches[1].clientX - touches[0].clientX,
        touches[1].clientY - touches[0].clientY
      );
      touchStartDistance.current = distance;
      touchStartZoom.current = zoom;
      touchStartPos.current = { ...position };
    }
  }, [position, zoom]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();

    const touches = e.touches;
    if (touches.length === 1 && isDragging) {
      // 单指拖拽
      setPosition(clampPosition({
        x: touches[0].clientX - dragStart.x,
        y: touches[0].clientY - dragStart.y,
      }, zoom));
    } else if (touches.length === 2) {
      // 双指缩放
      const container = containerRef.current;
      if (!container) return;

      const distance = Math.hypot(
        touches[1].clientX - touches[0].clientX,
        touches[1].clientY - touches[0].clientY
      );

      // 最小距离变化阈值，防止抖动
      if (Math.abs(distance - touchStartDistance.current) < 5) return;

      const scale = distance / touchStartDistance.current;
      const newZoom = Math.max(0.01, Math.min(10, touchStartZoom.current * scale));

      // 双指中心点作为缩放原点
      const rect = container.getBoundingClientRect();
      const centerX = (touches[0].clientX + touches[1].clientX) / 2 - rect.left - rect.width / 2;
      const centerY = (touches[0].clientY + touches[1].clientY) / 2 - rect.top - rect.height / 2;

      const zoomScale = newZoom / zoom;
      setPosition(clampPosition({
        x: centerX - zoomScale * (centerX - touchStartPos.current.x),
        y: centerY - zoomScale * (centerY - touchStartPos.current.y),
      }, newZoom));

      setZoom(newZoom);
    }
  }, [isDragging, dragStart, zoom, clampPosition]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    touchStartDistance.current = 0;
  }, []);

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

      setZoom(prev => {
        const newZoom = Math.max(0.01, Math.min(10, prev + delta));
        const scale = newZoom / prev;

        setPosition(pos => clampPosition({
          x: mouseX - scale * (mouseX - pos.x),
          y: mouseY - scale * (mouseY - pos.y),
        }, newZoom));

        return newZoom;
      });
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelNative);
  }, [clampPosition]);

  // 触屏事件监听器
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isTouchDevice.current) return;
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isTouchDevice.current) return;
    if (!isDragging) return;
    setPosition(clampPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }, zoom));
  }, [isDragging, dragStart, zoom, clampPosition]);

  const handleMouseUp = useCallback(() => {
    if (isTouchDevice.current) return;
    setIsDragging(false);
  }, []);

  // 工具栏事件处理
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z + 0.1, 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(z - 0.1, 0.01));
  }, []);

  const handleRotateLeft = useCallback(() => {
    setRotation(r => r - 90);
  }, []);

  const handleRotateRight = useCallback(() => {
    setRotation(r => r + 90);
  }, []);

  const handleFitToWidth = useCallback(() => {
    if (containerRef.current && naturalSize.width > 0 && naturalSize.height > 0) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const scaleX = containerWidth / naturalSize.width;
      const scaleY = containerHeight / naturalSize.height;
      const newZoom = Math.min(scaleX, scaleY);
      setZoom(Math.max(0.01, Math.min(10, newZoom)));
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [naturalSize]);

  const handleOriginalSize = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleReset = useCallback(() => {
    // 重置为自适应窗口，而不是原始尺寸
    handleFitToWidth();
  }, [handleFitToWidth]);

  // 工具栏配置
  const getToolbarGroups = useCallback((): ToolbarGroup[] => [
    {
      items: [
        { type: 'button', icon: <ZoomOut className="rfp-w-4 rfp-h-4" />, tooltip: t('toolbar.zoom_out'), action: handleZoomOut, disabled: zoom <= 0.01 },
        { type: 'text', content: `${Math.round(zoom * 100)}%`, minWidth: '3rem' },
        { type: 'button', icon: <ZoomIn className="rfp-w-4 rfp-h-4" />, tooltip: t('toolbar.zoom_in'), action: handleZoomIn, disabled: zoom >= 10 },
      ],
    },
    {
      items: [
        { type: 'button', icon: <Scan className="rfp-w-4 rfp-h-4" />, tooltip: t('toolbar.fit_to_window'), action: handleFitToWidth },
        { type: 'button', icon: <OriginalSizeIcon className="rfp-w-4 rfp-h-4" />, tooltip: t('toolbar.original_size'), action: handleOriginalSize },
      ],
    },
    {
      items: [
        { type: 'button', icon: <RotateCcw className="rfp-w-4 rfp-h-4" />, tooltip: t('toolbar.rotate_left'), action: handleRotateLeft },
        { type: 'button', icon: <RotateCw className="rfp-w-4 rfp-h-4" />, tooltip: t('toolbar.rotate_right'), action: handleRotateRight },
      ],
    },
    {
      items: [
        { type: 'button', icon: <RefreshCw className="rfp-w-4 rfp-h-4" />, tooltip: t('toolbar.reset'), action: handleReset },
      ],
    },
  ], [zoom, t, handleZoomIn, handleZoomOut, handleFitToWidth, handleOriginalSize, handleRotateLeft, handleRotateRight, handleReset]);

  // 暴露接口给父组件
  useImperativeHandle(ref, () => ({
    getToolbarGroups,
    onToolbarChange: (listener: () => void) => {
      listenersRef.current.add(listener);
      return () => listenersRef.current.delete(listener);
    },
    fitToWidth: handleFitToWidth,
    resetView: handleReset,
  }), [getToolbarGroups, handleFitToWidth, handleReset]);

  return (
    <div
      ref={containerRef}
      className="rfp-relative rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full rfp-overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
    >
      {/* 解码中 */}
      {decoding && (
        <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-flex-col rfp-items-center rfp-justify-center rfp-bg-surface-1/80 rfp-z-10">
          <Loader2 className="rfp-w-12 rfp-h-12 rfp-text-fg-primary rfp-animate-spin" />
          <p className="rfp-mt-4 rfp-text-fg-secondary">
            正在解码... {decodeProgress > 0 && `${Math.round(decodeProgress)}%`}
          </p>
        </div>
      )}

      {/* 解码错误 */}
      {decodeError && (
        <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-bg-surface-1/80 rfp-z-10">
          <RendererError message={t('image.decode_failed')} detail={decodeError} />
        </div>
      )}

      {!loaded && !error && !decoding && !decodeError && (
        <div className="rfp-flex rfp-items-center rfp-justify-center">
          <div className="rfp-w-12 rfp-h-12 rfp-border-4 rfp-border-line-strong rfp-border-t-spinner-head rfp-rounded-full rfp-animate-spin" />
        </div>
      )}

      {error && (
        <RendererError message={error} />
      )}

      {imageSrc && (
        <motion.img
          ref={imgRef}
          src={imageSrc}
          alt="Preview"
          className={`rfp-max-w-none rfp-select-none ${!loaded || error || decodeError ? 'rfp-hidden' : ''}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center',
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          }}
          onLoad={handleLoad}
          onError={handleError}
          onDoubleClick={handleDoubleClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded && !error && !decodeError ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          draggable={false}
        />
      )}

      {/* 右下角分辨率 */}
      {loaded && !error && naturalSize.width > 0 && (
        <div className="rfp-absolute rfp-bottom-2 rfp-right-3 rfp-text-[10px] rfp-text-fg-disabled hover:rfp-text-fg-secondary rfp-transition-colors rfp-pointer-events-auto rfp-select-none rfp-cursor-default">
          {naturalSize.width} × {naturalSize.height}{fileSize != null && ` · ${fileSize < 1024 ? `${fileSize} B` : fileSize < 1024 * 1024 ? `${(fileSize / 1024).toFixed(1)} KB` : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`}`}
        </div>
      )}

      {/* 多页 TIFF 翻页器 */}
      {totalPages > 1 && (
        <div className="rfp-absolute rfp-bottom-2 rfp-left-1/2 -rfp-translate-x-1/2 rfp-flex rfp-items-center rfp-gap-2 rfp-px-3 rfp-py-1.5 rfp-bg-surface-toolbar rfp-border rfp-border-line rfp-rounded-lg rfp-text-sm rfp-text-fg-primary rfp-shadow-md">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || decoding}
            className="rfp-px-2 rfp-py-0.5 rfp-rounded hover:rfp-bg-surface-nav-hover disabled:rfp-opacity-40 disabled:rfp-cursor-not-allowed"
          >
            上一页
          </button>
          <span className="rfp-text-fg-secondary rfp-tabular-nums">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || decoding}
            className="rfp-px-2 rfp-py-0.5 rfp-rounded hover:rfp-bg-surface-nav-hover disabled:rfp-opacity-40 disabled:rfp-cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
});
