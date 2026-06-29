import type { ZipToolbarStats } from '../renderers/Zip/toolbar';

/**
 * 渲染器通用状态
 */
export interface RendererCommonState {
  zoom: number;
  rotation: number;
}

/**
 * 图片渲染器状态
 */
export interface RendererImageState {
  naturalWidth: number;
  naturalHeight: number;
  resetKey: number;
}

/**
 * PDF 渲染器状态
 */
export interface RendererPdfState {
  currentPage: number;
  totalPages: number;
  showOutline: boolean;
}

/**
 * EPUB 渲染器状态
 */
export interface RendererEpubState {
  current: number;
  total: number;
  fullWidth: boolean;
}

/**
 * Mobi 渲染器状态
 */
export interface RendererMobiState {
  current: number;
  total: number;
  fullWidth: boolean;
}

/**
 * ZIP 渲染器状态
 */
export interface RendererZipState {
  stats: ZipToolbarStats | null;
}

/**
 * Text 渲染器状态
 */
export interface RendererTextState {
  wordWrap: boolean;
  htmlPreview: boolean;
}

/**
 * Markdown 渲染器状态
 */
export interface RendererMarkdownState {
  viewMode: 'preview' | 'source';
}

/**
 * 所有渲染器状态的聚合
 */
export interface RendererState {
  common: RendererCommonState;
  image: RendererImageState;
  pdf: RendererPdfState;
  epub: RendererEpubState;
  mobi: RendererMobiState;
  zip: RendererZipState;
  text: RendererTextState;
  markdown: RendererMarkdownState;
}

/**
 * 渲染器 Action 类型
 */
export type RendererAction =
  // 全局重置
  | { type: 'RESET' }
  // 通用状态
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_ROTATION'; payload: number }
  // 图片状态
  | { type: 'SET_IMAGE_NATURAL_SIZE'; payload: { width: number; height: number } }
  | { type: 'RESET_IMAGE' }
  // PDF 状态
  | { type: 'SET_PDF_PAGE'; payload: number }
  | { type: 'SET_PDF_TOTAL_PAGES'; payload: number }
  | { type: 'SET_PDF_OUTLINE'; payload: boolean }
  // EPUB 状态
  | { type: 'SET_EPUB_CHAPTER'; payload: { current: number; total: number } }
  | { type: 'SET_EPUB_FULL_WIDTH'; payload: boolean }
  // Mobi 状态
  | { type: 'SET_MOBI_CHAPTER'; payload: { current: number; total: number } }
  | { type: 'SET_MOBI_FULL_WIDTH'; payload: boolean }
  // ZIP 状态
  | { type: 'SET_ZIP_STATS'; payload: ZipToolbarStats | null }
  // Text 状态
  | { type: 'SET_TEXT_WORD_WRAP'; payload: boolean }
  | { type: 'SET_TEXT_HTML_PREVIEW'; payload: boolean }
  // Markdown 状态
  | { type: 'SET_MARKDOWN_VIEW_MODE'; payload: 'preview' | 'source' };

/**
 * 渲染器事件处理器集合
 */
export interface RendererHandlers {
  // 通用操作
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange: (zoom: number) => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onReset: () => void;
  onFitToWidth: () => void;
  onOriginalSize: () => void;
  // PDF 操作
  onPrevPage: () => void;
  onNextPage: () => void;
  onToggleOutline: () => void;
  // Text 操作
  onToggleWrap: () => void;
  onToggleHtmlPreview: () => void;
  // Markdown 操作
  onToggleViewMode: () => void;
  // EPUB/Mobi 操作（动态注入）
  [key: string]: (() => void) | ((value: any) => void);
}
