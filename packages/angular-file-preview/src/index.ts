export { VERSION } from './version';

export { FilePreviewModal } from './file-preview-modal';
export { FilePreviewEmbed } from './file-preview-embed';
export { FilePreviewContent } from './file-preview-content';

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
} from './fp-core';

export type { PdfWorkerOptions } from './fp-core';
export type { Locale, Messages, Translator, Theme } from './fp-core';

export { LocaleService } from './di/locale.service';
export { ThemeService } from './di/theme.service';
export { RequestService } from './di/request.service';
