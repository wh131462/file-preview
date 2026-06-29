import { useEffect } from 'react';

export interface UseImageAutoFitParams {
  enabled: boolean;
  naturalWidth: number;
  naturalHeight: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onZoomChange: (zoom: number) => void;
}

/**
 * 图片自动适应窗口 hook
 * 当图片加载完成后，自动计算适应窗口的缩放比例
 */
export function useImageAutoFit({
  enabled,
  naturalWidth,
  naturalHeight,
  containerRef,
  onZoomChange,
}: UseImageAutoFitParams): void {
  useEffect(() => {
    if (!enabled || naturalWidth <= 0 || naturalHeight <= 0 || !containerRef.current) {
      return;
    }

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const scaleX = containerWidth / naturalWidth;
    const scaleY = containerHeight / naturalHeight;
    const newZoom = Math.min(scaleX, scaleY);
    onZoomChange(Math.max(0.01, Math.min(10, newZoom)));
  }, [enabled, naturalWidth, naturalHeight, containerRef, onZoomChange]);
}
