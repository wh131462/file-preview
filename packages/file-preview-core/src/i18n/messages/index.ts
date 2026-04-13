import type { Locale, Messages } from '../types';
import { zhCN } from './zh-CN';
import { enUS } from './en-US';

/**
 * 内置语言字典
 * 字典权威源 — 两个 framework 包都从这里 import，杜绝双框架字典脱钩
 */
export const builtInMessages: Record<Locale, Messages> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

export { zhCN, enUS };
