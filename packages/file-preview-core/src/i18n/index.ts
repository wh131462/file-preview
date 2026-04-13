import type {
  CreateTranslatorOptions,
  Locale,
  MessageKey,
  Messages,
  TranslateParams,
  Translator,
} from './types';
import { builtInMessages } from './messages';

const PARAM_RE = /\{(\w+)\}/g;

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(PARAM_RE, (_, key) => {
    const v = params[key];
    return v === undefined ? `{${key}}` : String(v);
  });
}

/**
 * 创建一个翻译函数（纯函数，零依赖）。
 *
 * - locale 命中失败时会兜底到 `fallbackLocale`（默认 'zh-CN'）
 * - userMessages 浅合并到内置字典之上，可覆盖任何 key
 * - 翻译值中的 `{param}` 会被对应参数替换
 * - 完全找不到 key 时返回 key 本身，方便排错
 */
export function createTranslator(options: CreateTranslatorOptions): Translator {
  const fallbackLocale: Locale = options.fallbackLocale ?? 'zh-CN';
  const baseDict: Messages =
    builtInMessages[options.locale] ?? builtInMessages[fallbackLocale] ?? builtInMessages['zh-CN'];
  const userDict: Partial<Messages> | undefined = options.messages?.[options.locale];
  const mergedDict: Partial<Messages> = userDict ? { ...baseDict, ...userDict } : baseDict;
  // 最终兜底字典（zh-CN 一定存在）
  const finalFallback: Messages = builtInMessages['zh-CN'];

  return (key: MessageKey, params?: TranslateParams): string => {
    const template = mergedDict[key] ?? finalFallback[key] ?? key;
    return interpolate(template, params);
  };
}

export { builtInMessages };
export type {
  Locale,
  MessageKey,
  Messages,
  TranslateParams,
  Translator,
  CreateTranslatorOptions,
} from './types';
