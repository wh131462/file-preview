import React, { createContext, useContext, useMemo } from 'react';
import {
  createTranslator,
  type Locale,
  type Messages,
  type Translator,
} from '@eternalheart/file-preview-core';

export interface LocaleContextValue {
  locale: Locale;
  t: Translator;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export interface LocaleProviderProps {
  /** 当前语言，默认 'en-US' */
  locale?: Locale;
  /** 用户自定义字典，浅合并到内置字典之上 */
  messages?: Partial<Record<Locale, Partial<Messages>>>;
  children: React.ReactNode;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({
  locale: localeProp,
  messages,
  children,
}) => {
  const parent = useContext(LocaleContext);
  const locale = localeProp ?? parent?.locale ?? 'en-US';
  const value = useMemo<LocaleContextValue>(() => {
    const t = messages === undefined && parent?.locale === locale
      ? parent.t
      : createTranslator({ locale, messages });
    return { locale, t };
  }, [locale, messages, parent]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

/**
 * 兜底 translator（当组件被脱离 LocaleProvider 直接使用时）
 * 保持模块级单例，避免每次调用重建
 */
let fallbackTranslator: Translator | null = null;
function getFallbackTranslator(): Translator {
  if (!fallbackTranslator) {
    fallbackTranslator = createTranslator({ locale: 'en-US' });
  }
  return fallbackTranslator;
}

/**
 * 获取翻译函数。任意位置调用都安全：
 * - 在 LocaleProvider 下 → 用 provider 提供的 translator
 * - 否则 → 回落到 en-US 兜底 translator
 */
export function useTranslator(): Translator {
  const ctx = useContext(LocaleContext);
  return ctx?.t ?? getFallbackTranslator();
}

/**
 * 获取当前 locale。在 Provider 之外返回 'en-US'。
 */
export function useLocale(): Locale {
  const ctx = useContext(LocaleContext);
  return ctx?.locale ?? 'en-US';
}
