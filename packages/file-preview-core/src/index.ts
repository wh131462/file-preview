// 导出类型定义
export type {
  PreviewFile,
  PreviewFileLink,
  PreviewFileInput,
  FileType,
  PreviewState,
} from './types';

// 导出文件标准化工具
export {
  normalizeFile,
  normalizeFiles,
  getFileNameFromUrl,
  inferMimeType,
} from './utils/fileNormalizer';

// 导出文件类型识别 / 格式化工具
export {
  getFileType,
  getLanguageFromFileName,
  getVideoMimeType,
  formatFileSize,
  formatTime,
} from './utils/fileType';

// 导出 CSV/TSV 解析
export { parseCsv, guessCsvDelimiter } from './utils/csvParser';
export type { CsvParseOptions, CsvParseResult } from './utils/csvParser';

// 导出文本编码工具
export { decodeText, decodeUtf8, fetchTextUtf8 } from './utils/textDecoder';

// 导出字幕 / 歌词解析
export { parseSubtitle, formatSubtitleTime } from './utils/subtitleParser';
export type {
  SubtitleCue,
  SubtitleWord,
  SubtitleParseResult,
  SubtitleFormat,
} from './utils/subtitleParser';

// 导出 ZIP 工具
export {
  loadZip,
  listZipEntries,
  buildZipTree,
  readZipEntryText,
  readZipEntryBlob,
} from './utils/zipReader';
export type { ZipEntryInfo, ZipTreeNode } from './utils/zipReader';

// 导出 Excel 数据转换
export { convertWorkbookToSpreadsheetData } from './utils/excelDataConverter';

// 导出 PDF.js Worker 配置
export { configurePdfWorker } from './utils/pdfWorker';
export type { PdfWorkerOptions } from './utils/pdfWorker';

// 导出 i18n 国际化
export { createTranslator, builtInMessages } from './i18n';
export type {
  Locale,
  MessageKey,
  Messages,
  TranslateParams,
  Translator,
  CreateTranslatorOptions,
} from './i18n/types';
