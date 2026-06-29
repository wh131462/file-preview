import { useRef, useState, useCallback } from 'react';

export interface UseBookRendererReturn<T> {
  ref: React.RefObject<T | null>;
  current: number;
  total: number;
  fullWidth: boolean;
  setFullWidth: React.Dispatch<React.SetStateAction<boolean>>;
  handleChapterChange: (current: number, total: number) => void;
}

/**
 * 书籍渲染器（EPUB/Mobi）通用逻辑 hook
 * 统一 ref、状态管理和章节变化回调
 */
export function useBookRenderer<T>(
  onChapterChange?: (current: number, total: number) => void
): UseBookRendererReturn<T> {
  const ref = useRef<T>(null);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [fullWidth, setFullWidth] = useState(false);

  const handleChapterChange = useCallback(
    (curr: number, tot: number) => {
      setCurrent(curr);
      setTotal(tot);
      onChapterChange?.(curr, tot);
    },
    [onChapterChange]
  );

  return {
    ref,
    current,
    total,
    fullWidth,
    setFullWidth,
    handleChapterChange,
  };
}
