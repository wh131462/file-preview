import { DestroyRef, inject, signal } from '@angular/core';
import type { Theme } from '../fp-core';

export function createSystemDarkSignal() {
  const systemDark = signal(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true,
  );

  let cleanup: (() => void) | null = null;

  const bind = (theme: Theme) => {
    cleanup?.();
    cleanup = null;
    if (theme !== 'auto' || typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => systemDark.set(e.matches);
    mql.addEventListener('change', handler);
    cleanup = () => mql.removeEventListener('change', handler);
  };

  inject(DestroyRef).onDestroy(() => cleanup?.());

  return { systemDark, bind };
}

export function resolveTheme(theme: Theme, systemDark: boolean): 'dark' | 'light' {
  return theme === 'auto' ? (systemDark ? 'dark' : 'light') : theme;
}
