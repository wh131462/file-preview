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
 * - locale 命中失败时会兜底到 `fallbackLocale`（默认 'en-US'）
 * - userMessages 浅合并到内置字典之上，可覆盖任何 key
 * - 翻译值中的 `{param}` 会被对应参数替换
 * - 完全找不到 key 时返回 key 本身，方便排错
 */
export function createTranslator(options: CreateTranslatorOptions): Translator {
  const fallbackLocale: Locale = options.fallbackLocale ?? 'en-US';
  const baseDict: Partial<Messages> = {
    ...builtInMessages['en-US'],
    ...builtInMessages[fallbackLocale],
    ...options.messages?.[fallbackLocale],
    ...builtInMessages[options.locale],
  };
  const userDict: Partial<Messages> | undefined = options.messages?.[options.locale];
  const mergedDict: Partial<Messages> = userDict ? { ...baseDict, ...userDict } : baseDict;
  // 最终兜底字典（en-US 一定存在）
  const finalFallback: Messages = builtInMessages['en-US'];

  return (key: MessageKey, params?: TranslateParams): string => {
    const template = mergedDict[key] ?? finalFallback[key] ?? key;
    return interpolate(template, params);
  };
}

export { builtInMessages };

/** 可跨 Worker 传递的错误信息。 */
export type PreviewErrorDetail = string | PreviewErrorData | PreviewErrorDetail[];

export interface PreviewErrorData {
  key: MessageKey;
  params?: TranslateParams;
  detail?: PreviewErrorDetail;
}

function isPreviewError(error: unknown): error is PreviewErrorData {
  return typeof error === 'object' && error !== null && 'key' in error && typeof error.key === 'string';
}

export function serializeError(error: unknown): PreviewErrorDetail {
  if (Array.isArray(error)) return error.map(serializeError);
  if (isPreviewError(error)) {
    return { key: error.key, params: error.params, detail: error.detail };
  }
  return typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message ?? '')
    : String(error ?? '');
}

/** 底层保留词典键和参数，由调用方按自己的 locale 翻译。 */
export function translateError(t: Translator, error: unknown): string {
  if (Array.isArray(error)) return error.map((item) => translateError(t, item)).join('; ');
  if (isPreviewError(error)) {
    return t(error.key, {
      ...error.params,
      ...(error.detail !== undefined ? { error: translateError(t, error.detail) || t('common.unknown_error') } : {}),
    });
  }
  return typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message ?? '')
    : String(error ?? '');
}

const defaultTranslator = createTranslator({ locale: 'en-US' });

export class PreviewError extends Error implements PreviewErrorData {
  readonly detail?: PreviewErrorDetail;

  constructor(
    readonly key: MessageKey,
    readonly params?: TranslateParams,
    detail?: unknown,
  ) {
    const serialized = detail === undefined ? undefined : serializeError(detail);
    super(translateError(defaultTranslator, { key, params, detail: serialized }));
    this.name = 'PreviewError';
    this.detail = serialized;
  }
}

export type {
  Locale,
  MessageKey,
  Messages,
  TranslateParams,
  Translator,
  CreateTranslatorOptions,
} from './types';
