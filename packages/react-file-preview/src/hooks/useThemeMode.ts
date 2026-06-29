import { useState, useEffect } from 'react';
import type { Theme } from '@eternalheart/file-preview-core';

/**
 * 主题模式 hook
 * 处理 auto 主题时的系统偏好监听
 */
export function useThemeMode(theme: Theme): 'light' | 'dark' {
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  );

  useEffect(() => {
    if (theme !== 'auto') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);

  return theme === 'auto' ? (systemDark ? 'dark' : 'light') : theme;
}
