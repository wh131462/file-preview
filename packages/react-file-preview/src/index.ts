// 导入样式
import './index.css';

// 导入版本号
import packageJson from '../package.json';

// 导出版本号
export const VERSION = packageJson.version;

// 自动配置 PDF.js worker（使用 CDN 默认配置）
// 用户可以通过调用 configurePdfjs() 覆盖此配置
import { configurePdfjs } from './utils/pdfConfig';
if (typeof window !== 'undefined') {
  configurePdfjs();
}

// 导出主组件
export { FilePreviewModal } from './FilePreviewModal';
export { FilePreviewEmbed } from './FilePreviewEmbed';
export { FilePreviewContent } from './FilePreviewContent';

// 导出类型定义
export type {
  PreviewFile,
  PreviewFileLink,
  PreviewFileInput,
  FileType,
  ToolbarAction,
  PreviewState,
  CustomRenderer,
  CustomRendererContext,
  CustomRendererEventPayload,
} from './types';

// 导出工具函数和常量
export { normalizeFile, normalizeFiles } from './utils/fileNormalizer';
export { SUPPORTED_FILE_TYPES } from '@eternalheart/file-preview-core';

// 导出 PDF.js 配置函数和类型
export { configurePdfjs, pdfjs } from './utils/pdfConfig';
export type { PdfConfigOptions } from './utils/pdfConfig';

// 导出 i18n 国际化
export { LocaleProvider, useTranslator, useLocale } from './i18n/LocaleContext';
export type { LocaleProviderProps, LocaleContextValue } from './i18n/LocaleContext';
export type {
  Locale,
  Messages,
  MessageKey,
  Translator,
  TranslateParams,
  CreateTranslatorOptions,
  Theme,
} from '@eternalheart/file-preview-core';

