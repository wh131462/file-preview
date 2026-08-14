import { inject } from '@angular/core';
import { createTranslator, type Locale, type Translator } from '@eternalheart/file-preview-core';
import { AFP_LOCALE } from './tokens';

let fallbackT: Translator | null = null;
function getFallback(): Translator {
  if (!fallbackT) fallbackT = createTranslator({ locale: 'zh-CN' });
  return fallbackT;
}

export function injectTranslator(): { locale: () => Locale; t: () => Translator } {
  const injected = inject(AFP_LOCALE, { optional: true });
  if (injected) {
    return {
      locale: () => injected.locale(),
      t: () => injected.t(),
    };
  }
  return {
    locale: () => 'zh-CN',
    t: () => getFallback(),
  };
}
