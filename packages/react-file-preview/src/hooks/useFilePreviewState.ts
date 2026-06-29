import { useReducer, useEffect } from 'react';
import { rendererReducer, initialRendererState } from './rendererReducer';
import type { RendererState, RendererAction } from './types';

/**
 * 文件预览状态管理 hook
 * 自动在 currentIndex 改变时重置所有状态
 */
export function useFilePreviewState(currentIndex: number): {
  state: RendererState;
  dispatch: React.Dispatch<RendererAction>;
} {
  const [state, dispatch] = useReducer(rendererReducer, initialRendererState);

  useEffect(() => {
    dispatch({ type: 'RESET' });
  }, [currentIndex]);

  return { state, dispatch };
}
