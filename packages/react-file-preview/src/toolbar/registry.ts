import type { ToolbarGroup } from '../renderers/toolbar.types';
import type { Translator } from '@eternalheart/file-preview-core';
import type { RendererState } from '../hooks/types';
import type { EpubRendererHandle } from '../renderers/Epub';
import type { MobiRendererHandle } from '../renderers/Mobi';
import { getImageToolbarGroups } from '../renderers/Image/toolbar';
import { getPdfToolbarGroups } from '../renderers/Pdf/toolbar';
import { getEpubToolbarGroups } from '../renderers/Epub/toolbar';
import { getMobiToolbarGroups } from '../renderers/Mobi/toolbar';
import { getZipToolbarGroups } from '../renderers/Zip/toolbar';
import { getTextToolbarGroups } from '../renderers/Text/toolbar';
import { getMarkdownToolbarGroups } from '../renderers/Markdown/toolbar';

/**
 * 工具栏配置工厂调用上下文
 * 包含状态、回调引用和 i18n 翻译函数
 */
export interface ToolbarFactoryContext {
  state: RendererState;
  t: Translator;
  fileName: string;
  // 通用回调
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFitToWidth: () => void;
  onOriginalSize: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  // PDF 回调
  onPrevPage: () => void;
  onNextPage: () => void;
  onToggleOutline: () => void;
  // Text 回调
  onToggleWrap: () => void;
  onToggleHtmlPreview: () => void;
  // Markdown 回调
  onToggleViewMode: () => void;
  // 书籍渲染器 refs
  epubRef: React.RefObject<EpubRendererHandle | null>;
  mobiRef: React.RefObject<MobiRendererHandle | null>;
  // 书籍渲染器状态（从 useBookRenderer 返回）
  epubCurrent?: number;
  epubTotal?: number;
  epubFullWidth?: boolean;
  mobiCurrent?: number;
  mobiTotal?: number;
  mobiFullWidth?: boolean;
}

/**
 * 工具栏配置工厂签名
 */
export type ToolbarConfigFactory = (ctx: ToolbarFactoryContext) => ToolbarGroup[];

/**
 * 工具栏配置注册表
 * Key 为 fileType，Value 为工厂函数
 */
const TOOLBAR_CONFIG_MAP: Record<string, ToolbarConfigFactory> = {
  image: (ctx) =>
    getImageToolbarGroups({
      zoom: ctx.state.common.zoom,
      onZoomIn: ctx.onZoomIn,
      onZoomOut: ctx.onZoomOut,
      onFitToWidth: ctx.onFitToWidth,
      onOriginalSize: ctx.onOriginalSize,
      onRotateLeft: ctx.onRotateLeft,
      onRotateRight: ctx.onRotateRight,
      onReset: ctx.onReset,
      t: ctx.t,
    }),

  pdf: (ctx) =>
    getPdfToolbarGroups({
      zoom: ctx.state.common.zoom,
      currentPage: ctx.state.pdf.currentPage,
      totalPages: ctx.state.pdf.totalPages || 0,
      onZoomIn: ctx.onZoomIn,
      onZoomOut: ctx.onZoomOut,
      onReset: ctx.onReset,
      onPrevPage: ctx.onPrevPage,
      onNextPage: ctx.onNextPage,
      onToggleOutline: ctx.onToggleOutline,
      t: ctx.t,
    }),

  epub: (ctx) =>
    getEpubToolbarGroups({
      epubRef: ctx.epubRef,
      current: ctx.epubCurrent ?? ctx.state.epub.current,
      total: ctx.epubTotal ?? ctx.state.epub.total,
      fullWidth: ctx.epubFullWidth ?? ctx.state.epub.fullWidth,
      t: ctx.t,
    }),

  mobi: (ctx) =>
    getMobiToolbarGroups({
      mobiRef: ctx.mobiRef,
      current: ctx.mobiCurrent ?? ctx.state.mobi.current,
      total: ctx.mobiTotal ?? ctx.state.mobi.total,
      fullWidth: ctx.mobiFullWidth ?? ctx.state.mobi.fullWidth,
      t: ctx.t,
    }),

  zip: (ctx) => getZipToolbarGroups({ stats: ctx.state.zip.stats, t: ctx.t }),

  text: (ctx) => {
    const ext = ctx.fileName.split('.').pop()?.toLowerCase() || '';
    return getTextToolbarGroups({
      wordWrap: ctx.state.text.wordWrap,
      onToggleWrap: ctx.onToggleWrap,
      isHtml: ext === 'html' || ext === 'htm',
      htmlPreview: ctx.state.text.htmlPreview,
      onToggleHtmlPreview: ctx.onToggleHtmlPreview,
      t: ctx.t,
    });
  },

  markdown: (ctx) =>
    getMarkdownToolbarGroups({
      viewMode: ctx.state.markdown.viewMode,
      onToggleViewMode: ctx.onToggleViewMode,
      t: ctx.t,
    }),
};

/**
 * 根据文件类型获取工具栏配置
 * @param fileType 文件类型
 * @param ctx 上下文（状态 + 回调）
 * @returns 工具栏组数组，未知类型返回空数组
 */
export function getToolbarGroups(
  fileType: string,
  ctx: ToolbarFactoryContext
): ToolbarGroup[] {
  const factory = TOOLBAR_CONFIG_MAP[fileType];
  return factory ? factory(ctx) : [];
}

/**
 * 注册自定义工具栏工厂（供外部扩展）
 */
export function registerToolbarFactory(fileType: string, factory: ToolbarConfigFactory): void {
  TOOLBAR_CONFIG_MAP[fileType] = factory;
}
