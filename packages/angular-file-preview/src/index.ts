import './index.css';

import packageJson from '../package.json';

export const VERSION = packageJson.version;

export { FilePreviewModalComponent as FilePreviewModal } from './file-preview-modal.component';
export { FilePreviewEmbedComponent as FilePreviewEmbed } from './file-preview-embed.component';
export { FilePreviewContentComponent as FilePreviewContent } from './file-preview-content.component';

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
  RequestHandler,
  RequestInitFactory,
  RequestOptions,
  Fetcher,
  ShouldFetchAsBlob,
} from './types';

export {
  normalizeFile,
  normalizeFiles,
  getFileType,
  configurePdfWorker,
  SUPPORTED_FILE_TYPES,
} from '@eternalheart/file-preview-core';

export type { PdfWorkerOptions } from '@eternalheart/file-preview-core';

export { injectTranslator } from './inject/translator';
export { injectResolvedTheme } from './inject/theme';
export type { Locale, Messages, Translator, Theme } from '@eternalheart/file-preview-core';
