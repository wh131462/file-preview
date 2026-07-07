// @ts-ignore - pdfjs-dist 类型路径
// Electron 环境使用 legacy 构建版本以避免 Web Streams API 兼容性问题
// 参考: https://github.com/mozilla/pdf.js/issues/16214
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { configurePdfWorker } from '@eternalheart/file-preview-core';

/**
 * PDF.js Worker 配置选项
 */
export interface PdfConfigOptions {
  /**
   * PDF.js worker 文件路径
   * 默认使用 CDN: `https://unpkg.com/pdfjs-dist@${version}/legacy/build/pdf.worker.min.mjs`
   * 注意：为兼容 Electron 环境，使用 legacy 构建版本
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
 * 注意：为兼容 Electron 环境，本库使用 pdfjs-dist 的 legacy 构建版本。
 * 如果手动配置 workerSrc，请确保使用对应的 legacy worker 文件。
 *
 * @example
 * ```ts
 * // 使用本地静态文件（推荐用于生产环境，Electron 环境必须使用 legacy 版本）
 * configurePdfjs({
 *   workerSrc: '/pdfjs/pdf.worker.min.mjs', // 确保使用 legacy/build/pdf.worker.min.mjs
 *   cMapUrl: '/pdfjs/cmaps/',
 *   cMapPacked: true
 * });
 * ```
 *
 * @example
 * ```ts
 * // 使用 CDN（默认配置，自动使用 legacy 版本）
 * configurePdfjs(); // 自动使用 unpkg CDN 的 legacy 构建
 * ```
 */
export function configurePdfjs(options?: PdfConfigOptions) {
  configurePdfWorker(pdfjsLib, options);
}

export { pdfjsLib as pdfjs };
