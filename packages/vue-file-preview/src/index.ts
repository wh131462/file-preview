// 导入样式
import './index.css';

// 导入版本号
import packageJson from '../package.json';

// 导出版本号
export const VERSION = packageJson.version;

// 导出主组件
export { default as FilePreviewModal } from './FilePreviewModal.vue';
export { default as FilePreviewEmbed } from './FilePreviewEmbed.vue';
export { default as FilePreviewContent } from './FilePreviewContent.vue';

// 导出类型定义
export type {
  PreviewFile,
  PreviewFileLink,
  PreviewFileInput,
  FileType,
  PreviewState,
  ToolbarAction,
  CustomRenderer,
  CustomRendererContext,
  CustomRendererEventPayload,
} from './types';

// 导出工具函数
export {
  normalizeFile,
  normalizeFiles,
  getFileType,
  configurePdfWorker,
} from '@eternalheart/file-preview-core';

export type { PdfWorkerOptions } from '@eternalheart/file-preview-core';

// 导出 i18n 相关
export { useTranslator, provideLocale } from './composables/useTranslator';
export { LOCALE_KEY } from './i18n/localeKey';
export type { Locale, Messages, Translator, Theme } from '@eternalheart/file-preview-core';
