// @ts-ignore - pdfjs-dist 类型路径
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import { configurePdfWorker } from '@eternalheart/file-preview-core';

/**
 * PDF.js Worker 配置选项
 */
export interface PdfConfigOptions {
  /**
   * PDF.js worker 文件路径
   * 默认使用 CDN: `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`
   */
  workerSrc?: string;

  /**
   * CMap 文件目录路径
   * 默认使用 CDN: `https://unpkg.com/pdfjs-dist@${version}/cmaps/`
   */
  cMapUrl?: string;

  /**
   * 是否使用压缩的 CMap 文件
   * 默认: true
   */
  cMapPacked?: boolean;
}

/**
 * 配置 PDF.js
 *
 * @example
 * ```ts
 * // 使用本地静态文件（推荐用于生产环境）
 * configurePdfjs({
 *   workerSrc: '/pdfjs/pdf.worker.min.mjs',
 *   cMapUrl: '/pdfjs/cmaps/',
 *   cMapPacked: true
 * });
 * ```
 *
 * @example
 * ```ts
 * // 使用 CDN（默认配置）
 * configurePdfjs(); // 自动使用 unpkg CDN
 * ```
 */
export function configurePdfjs(options?: PdfConfigOptions) {
  configurePdfWorker(pdfjsLib, options);
}

export { pdfjsLib as pdfjs };
