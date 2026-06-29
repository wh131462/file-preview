import { useEffect, useRef } from 'react';

export interface UseKeyboardNavigationParams {
  mode: 'modal' | 'embed';
  currentIndex: number;
  totalFiles: number;
  onNavigate?: (index: number) => void;
  onClose?: () => void;
  rootRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * 键盘导航 hook
 * - modal 模式：监听 window 的 keydown 事件
 * - embed 模式：仅监听根容器的 keydown 事件（需要容器获得焦点）
 */
export function useKeyboardNavigation({
  mode,
  currentIndex,
  totalFiles,
  onNavigate,
  onClose,
  rootRef,
}: UseKeyboardNavigationParams): void {
  const handlersRef = useRef({ onNavigate, onClose });

  useEffect(() => {
    handlersRef.current = { onNavigate, onClose };
  }, [onNavigate, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { onNavigate, onClose } = handlersRef.current;

      if (e.key === 'Escape' && mode === 'modal') {
        onClose?.();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate?.(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < totalFiles - 1) {
        onNavigate?.(currentIndex + 1);
      }
    };

    if (mode === 'modal') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    } else {
      const el = rootRef?.current;
      if (!el) return;
      el.addEventListener('keydown', handleKeyDown as EventListener);
      return () => el.removeEventListener('keydown', handleKeyDown as EventListener);
    }
  }, [mode, currentIndex, totalFiles, rootRef]);
}
