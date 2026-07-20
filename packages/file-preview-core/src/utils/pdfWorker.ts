import { installUint8ArrayHexBase64Polyfill } from './uint8ArrayPolyfill';

/**
 * PDF.js Worker 配置选项
 */
export interface PdfWorkerOptions {
  /**
   * PDF.js worker 文件路径
   * 默认使用 CDN
   */
  workerSrc?: string;

  /**
   * CMap 文件目录路径
   * 默认使用 CDN
   */
  cMapUrl?: string;

  /**
   * 是否使用压缩的 CMap 文件
   * 默认: true
   */
  cMapPacked?: boolean;
}

/**
 * 配置 PDF.js GlobalWorkerOptions（框架无关）
 *
 * @param pdfjs - pdfjs-dist 模块（由调用方传入，避免 core 包硬依赖 pdfjs-dist）
 * @param options - 配置选项
 *
 * @example
 * ```ts
 * import * as pdfjs from 'pdfjs-dist';
 * import { configurePdfWorker } from '@eternalheart/file-preview-core';
 *
 * configurePdfWorker(pdfjs, {
 *   workerSrc: '/pdfjs/pdf.worker.min.mjs',
 *   cMapUrl: '/pdfjs/cmaps/',
 *   cMapPacked: true,
 * });
 * ```
 */
export function configurePdfWorker(
  pdfjs: any,
  options?: PdfWorkerOptions
): void {
  if (typeof window === 'undefined') return;

  // 优先安装 Uint8Array hex/base64 polyfill（pdfjs 6.x 依赖）
  // webpack/umi 环境下 pdfjs legacy 自带的 core-js polyfill 可能被 tree-shake
  installUint8ArrayHexBase64Polyfill();

  const version = pdfjs?.version || pdfjs?.GlobalWorkerOptions?.version || '';

  const {
    workerSrc = `https://unpkg.com/pdfjs-dist@${version}/legacy/build/pdf.worker.min.mjs`,
    cMapUrl = `https://unpkg.com/pdfjs-dist@${version}/cmaps/`,
    cMapPacked = true,
  } = options || {};

  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    pdfjs.GlobalWorkerOptions.cMapUrl = cMapUrl;
    pdfjs.GlobalWorkerOptions.cMapPacked = cMapPacked;
  }
}
