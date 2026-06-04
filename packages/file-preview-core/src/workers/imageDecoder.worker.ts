/// <reference lib="webworker" />
/**
 * 图片解码 Web Worker
 *
 * 用于在主线程外执行耗时的 WASM 解码（HEIC/RAW/PSD），避免阻塞 UI。
 *
 * 消息协议：
 * - 接收：{ id: string, mimeType: string, buffer: ArrayBuffer, options?: DecodeOptions }
 * - 返回成功：{ id: string, success: true, data: ArrayBuffer, mimeType: string }
 * - 返回失败：{ id: string, success: false, error: string }
 */

import type { DecodeOptions } from '../loaders/types';

declare const self: DedicatedWorkerGlobalScope;

interface DecodeRequest {
  id: string;
  mimeType: string;
  buffer: ArrayBuffer;
  options?: DecodeOptions;
}

interface DecodeSuccessResponse {
  id: string;
  success: true;
  data: ArrayBuffer;
  mimeType: string;
}

interface DecodeErrorResponse {
  id: string;
  success: false;
  error: string;
}

type DecodeResponse = DecodeSuccessResponse | DecodeErrorResponse;

// 在 worker 中获取 loader
async function getLoaderInWorker(mimeType: string) {
  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    const module = await import('../loaders/heicLoader');
    return module.default;
  }
  if (
    mimeType === 'image/x-canon-cr2' ||
    mimeType === 'image/x-nikon-nef' ||
    mimeType === 'image/x-sony-arw' ||
    mimeType === 'image/x-adobe-dng' ||
    mimeType === 'image/x-fuji-raf' ||
    mimeType === 'image/x-olympus-orf'
  ) {
    const module = await import('../loaders/rawLoader');
    return module.default;
  }
  if (mimeType === 'image/vnd.adobe.photoshop') {
    const module = await import('../loaders/psdLoader');
    return module.default;
  }
  return null;
}

self.onmessage = async (event: MessageEvent<DecodeRequest>) => {
  const { id, mimeType, buffer, options } = event.data;

  try {
    const loader = await getLoaderInWorker(mimeType);
    if (!loader) {
      const response: DecodeErrorResponse = {
        id,
        success: false,
        error: `不支持的 MIME 类型: ${mimeType}`,
      };
      self.postMessage(response);
      return;
    }

    const result = await loader.decode(buffer, options);
    const resultBlob = result instanceof Blob ? result : new Blob([result], { type: 'image/png' });
    const arrayBuffer = await resultBlob.arrayBuffer();

    const response: DecodeSuccessResponse = {
      id,
      success: true,
      data: arrayBuffer,
      mimeType: resultBlob.type || 'image/png',
    };
    // 使用 transferable 减少拷贝
    self.postMessage(response, [arrayBuffer]);
  } catch (error: any) {
    const response: DecodeErrorResponse = {
      id,
      success: false,
      error: error?.message || '解码失败',
    };
    self.postMessage(response);
  }
};

export type { DecodeRequest, DecodeResponse, DecodeSuccessResponse, DecodeErrorResponse };
