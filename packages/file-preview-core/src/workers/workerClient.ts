import type { DecodeOptions } from '../loaders/types';
// 内联 Worker，避免 core 产物被上层 React/Vue 包再次打包时丢失相对资源路径。
// @ts-ignore - Vite 虚拟模块，无类型声明
import AdvancedImageDecoderWorker from './imageDecoder.worker?worker&inline';

/**
 * 应该使用 Worker 解码的 MIME 类型（耗时较长的格式）
 */
const WORKER_DECODE_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/x-canon-cr2',
  'image/x-nikon-nef',
  'image/x-sony-arw',
  'image/x-adobe-dng',
  'image/x-fuji-raf',
  'image/x-olympus-orf',
  'image/vnd.adobe.photoshop',
]);

/**
 * 检测某 MIME 类型是否适合在 Worker 中解码
 */
export function shouldUseWorker(mimeType: string): boolean {
  return WORKER_DECODE_TYPES.has(mimeType);
}

/**
 * 在 Web Worker 中解码图片
 *
 * @param mimeType MIME 类型
 * @param buffer 原始文件 ArrayBuffer
 * @param options 解码选项
 * @returns 解码后的 Blob
 */
export async function decodeInWorker(
  mimeType: string,
  buffer: ArrayBuffer,
  options?: DecodeOptions
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new AdvancedImageDecoderWorker();
    } catch (err: any) {
      reject(new Error(`无法创建 Worker: ${err?.message || '未知错误'}`));
      return;
    }

    const requestId = Math.random().toString(36).slice(2);

    const handleMessage = (event: MessageEvent) => {
      const response = event.data;
      if (response.id !== requestId) return;

      if (response.success) {
        const blob = new Blob([response.data], { type: response.mimeType });
        cleanup();
        resolve(blob);
      } else {
        cleanup();
        reject(new Error(response.error || '解码失败'));
      }
    };

    const handleError = (event: ErrorEvent) => {
      cleanup();
      reject(new Error(`Worker 崩溃: ${event.message || '设备内存不足'}`));
    };

    const cleanup = () => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      worker.terminate();
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    // 传输 buffer 所有权以避免拷贝
    worker.postMessage(
      { id: requestId, mimeType, buffer, options },
      [buffer]
    );
  });
}
