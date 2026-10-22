import { provide, inject, computed, unref, type Ref, type MaybeRef, type ComputedRef } from 'vue';
import { createTranslator, type Locale, type Messages, type Translator } from '@eternalheart/file-preview-core';
import { LOCALE_KEY, type LocaleInjection } from '../i18n/localeKey';

/**
 * 在主组件中调用，向子树注入 locale context
 */
export function provideLocale(
  locale: MaybeRef<Locale | undefined>,
  messages?: MaybeRef<Partial<Record<Locale, Partial<Messages>>> | undefined>,
): LocaleInjection {
  const parent = inject<LocaleInjection | null>(LOCALE_KEY, null);
  const localeRef = computed<Locale>(() => unref(locale) ?? parent?.locale.value ?? 'en-US');
  const t = computed<Translator>(() =>
    unref(messages) === undefined && parent?.locale.value === localeRef.value
      ? parent.t.value
      : createTranslator({ locale: localeRef.value, messages: unref(messages) }),
  );
  const context = { locale: localeRef as Ref<Locale>, t };
  provide(LOCALE_KEY, context);
  return context;
}

// 兜底 translator（模块级单例）
let fallbackT: Translator | null = null;
function getFallback(): Translator {
  if (!fallbackT) fallbackT = createTranslator({ locale: 'en-US' });
  return fallbackT;
}

/**
 * 获取翻译函数。在 provider 外使用时自动 fallback 到 en-US。
 */
export function useTranslator(): { locale: Ref<Locale>; t: ComputedRef<Translator> } {
  const injected = inject<LocaleInjection | null>(LOCALE_KEY, null);
  if (injected) return injected;
  // fallback
  const locale = computed<Locale>(() => 'en-US');
  const t = computed<Translator>(() => getFallback());
  return { locale: locale as Ref<Locale>, t };
}
