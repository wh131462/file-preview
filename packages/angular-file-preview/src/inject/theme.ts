import { inject } from '@angular/core';
import { AFP_THEME, type ResolvedTheme } from './tokens';

export function injectResolvedTheme(): () => ResolvedTheme {
  const injected = inject(AFP_THEME, { optional: true });
  if (injected) return () => injected();
  return () => 'dark';
}
