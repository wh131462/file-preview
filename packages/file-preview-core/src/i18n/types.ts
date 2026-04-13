/**
 * 国际化（i18n）类型定义
 * 框架无关，零依赖
 */

/** 内置 zh-CN / en-US，也允许任意自定义 locale 字符串 */
export type Locale = 'zh-CN' | 'en-US' | (string & {});

/** 翻译 key（点号分组的扁平字符串，如 'toolbar.zoom_in'） */
export type MessageKey = string;

/** 单个语言的字典：key → 翻译值（值中可包含 {param} 形式占位） */
export type Messages = Record<MessageKey, string>;

/** 翻译参数（用于 {param} 插值） */
export type TranslateParams = Record<string, string | number>;

/** 翻译函数 */
export type Translator = (key: MessageKey, params?: TranslateParams) => string;

/** createTranslator 选项 */
export interface CreateTranslatorOptions {
  /** 当前语言 */
  locale: Locale;
  /** 用户自定义字典，浅合并到内置字典之上 */
  messages?: Partial<Record<Locale, Partial<Messages>>>;
  /** locale 命中失败时的兜底语言，默认 'zh-CN' */
  fallbackLocale?: Locale;
}
