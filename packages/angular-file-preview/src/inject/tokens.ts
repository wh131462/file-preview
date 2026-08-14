import { InjectionToken, type Signal } from '@angular/core';
import type { Locale, Messages, Translator } from '@eternalheart/file-preview-core';
import type { Fetcher, ShouldFetchAsBlob } from '@eternalheart/file-preview-core';

export type ResolvedTheme = 'dark' | 'light';

export interface LocaleContextValue {
  locale: Signal<Locale>;
  t: Signal<Translator>;
}

export interface RequestContextValue {
  fetcher: Fetcher;
  shouldFetchAsBlob?: ShouldFetchAsBlob;
}

export const AFP_LOCALE = new InjectionToken<LocaleContextValue>('afp-locale');
export const AFP_THEME = new InjectionToken<Signal<ResolvedTheme>>('afp-theme');
export const AFP_REQUEST = new InjectionToken<Signal<RequestContextValue>>('afp-request');
export const AFP_MESSAGES = new InjectionToken<Signal<Partial<Record<Locale, Partial<Messages>>> | undefined>>('afp-messages');
