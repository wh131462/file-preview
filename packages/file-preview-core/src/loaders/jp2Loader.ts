import type { ImageDecoder, DecodeOptions, ImageMetadata } from './types';
// Vite 特有语法：`?worker&inline` 把 worker 代码（含 jpeg2000/openjpeg 依赖）
// 在 build 时打包并以 base64 内联到当前 chunk，运行时通过 Blob URL 启动。
// 消费方无需为 worker 配置任何额外路径。
// @ts-ignore - vite 虚拟模块，无类型声明
import Jp2DecodeWorker from './jp2Worker?worker&inline';

/**
 * 缓存浏览器原生 JPEG 2000 支持检测结果
 */
let nativeJp2Support: boolean | null = null;

/**
 * 检测浏览器是否原生支持 JPEG 2000（仅 Safari）
 */
async function supportsJp2(): Promise<boolean> {
  if (nativeJp2Support !== null) {
    return nativeJp2Support;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      nativeJp2Support = img.width === 1 && img.height === 1;
      resolve(nativeJp2Support);
    };
    img.onerror = () => {
      nativeJp2Support = false;
      resolve(false);
    };
    img.src =
      'data:image/jp2;base64,AAAADGpQICANCocKAAAAFGZ0eXBqcDIgAAAAAGpwMiAAAAAtanAyaAAAABZpaGRyAAAAAQAAAAEAAQcHAAAAAAAPY29scgEAAAAAABEAAACVanAyY/9P/1EALwAAAAAAAQAAAAEAAAAAAAAAAAAAAAEAAAABAAAAAAAAAAAAAQcBAQcBAQcB/1IADAAAAAAEBP8AAQH/XAAEQEDoP2QAGgABAAAAAAQEBAEAAEhBRkY=';
  });
}

/**
 * 从 JP2 容器中提取 JPEG 2000 codestream
 * JP2 文件是 ISO base media file format，包含若干 box，codestream 位于 'jp2c' box 中。
 */
function extractCodestream(buffer: Uint8Array): Uint8Array {
  if (buffer[0] === 0xff && buffer[1] === 0x4f && buffer[2] === 0xff && buffer[3] === 0x51) {
    return buffer;
  }

  // box 结构：[4B size][4B type]([8B XLBox size, 仅 size==1])[payload]
  let offset = 0;
  while (offset + 8 <= buffer.length) {
    const boxSizeRaw =
      ((buffer[offset] << 24) |
        (buffer[offset + 1] << 16) |
        (buffer[offset + 2] << 8) |
        buffer[offset + 3]) >>>
      0;
    const boxType = String.fromCharCode(
      buffer[offset + 4],
      buffer[offset + 5],
      buffer[offset + 6],
      buffer[offset + 7]
    );

    let headerSize = 8;
    let totalSize = boxSizeRaw;
    if (boxSizeRaw === 1) {
      if (offset + 16 > buffer.length) break;
      const hi =
        ((buffer[offset + 8] << 24) |
          (buffer[offset + 9] << 16) |
          (buffer[offset + 10] << 8) |
          buffer[offset + 11]) >>>
        0;
      const lo =
        ((buffer[offset + 12] << 24) |
          (buffer[offset + 13] << 16) |
          (buffer[offset + 14] << 8) |
          buffer[offset + 15]) >>>
        0;
      totalSize = hi === 0 ? lo : hi * 0x100000000 + lo;
      headerSize = 16;
    }

    if (boxType === 'jp2c') {
      const payloadEnd = boxSizeRaw === 0 ? undefined : offset + totalSize;
      return buffer.slice(offset + headerSize, payloadEnd);
    }

    if (boxSizeRaw === 0) break;
    if (totalSize < headerSize) break;
    offset += totalSize;
  }

  return buffer;
}

/**
 * 在 Worker 中解码 codestream，返回 RGBA 像素数据。
 *
 * 单例 Worker：所有解码请求复用同一个 Worker（OpenJPEG 模块也复用，避免重复初始化）。
 * 通过自增 id 区分请求，便于多页/多次解码并发。
 */
let workerInstance: Worker | null = null;
let nextRequestId = 1;
const pendingRequests = new Map<
  number,
  { resolve: (v: { rgba: Uint8ClampedArray; width: number; height: number }) => void; reject: (e: Error) => void }
>();

function getWorker(): Worker {
  if (!workerInstance) {
    const w = new Jp2DecodeWorker();
    w.addEventListener('message', (e: MessageEvent) => {
      const data = e.data as
        | { id: number; ok: true; rgba: Uint8ClampedArray; width: number; height: number }
        | { id: number; ok: false; error: string };
      const pending = pendingRequests.get(data.id);
      if (!pending) return;
      pendingRequests.delete(data.id);
      if (data.ok) {
        pending.resolve({ rgba: data.rgba, width: data.width, height: data.height });
      } else {
        pending.reject(new Error(`JPEG 2000 解码失败：${data.error}`));
      }
    });
    w.addEventListener('error', (e: ErrorEvent) => {
      const err = new Error(`JPEG 2000 Worker 异常：${e.message || '未知错误'}`);
      pendingRequests.forEach(({ reject }) => reject(err));
      pendingRequests.clear();
    });
    workerInstance = w;
    return w;
  }
  return workerInstance;
}

function decodeInWorker(
  codestream: Uint8Array
): Promise<{ rgba: Uint8ClampedArray; width: number; height: number }> {
  const worker = getWorker();
  const id = nextRequestId++;
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    // 复制一份再 transfer，避免原 buffer 被 detach 影响后续 fallback
    const copy = codestream.slice();
    worker.postMessage({ id, codestream: copy }, [copy.buffer]);
  });
}

/**
 * 把 RGBA 像素数据渲染到 Canvas 并导出为 Blob（在主线程执行，耗时短）
 */
function rgbaToBlob(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  outputFormat: string
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 2D 上下文');
  const imageData = new ImageData(
    rgba as Uint8ClampedArray<ArrayBuffer>,
    width,
    height
  );
  ctx.putImageData(imageData, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('JPEG 2000 Canvas 转 Blob 失败'));
      },
      outputFormat
    );
  });
}

/**
 * JPEG 2000 图片解码器
 *
 * 解码路径：
 *   1. Safari 原生支持 → 直接返回原文件
 *   2. Worker（jpeg2000 → OpenJPEG WASM 内部回退）→ 主线程不阻塞，CSS 动画流畅
 *   3. 主线程仅承担 Canvas 渲染（毫秒级，不影响动画）
 */
class Jp2Loader implements ImageDecoder {
  async needsDecode(mimeType: string): Promise<boolean> {
    if (mimeType !== 'image/jp2' && mimeType !== 'image/jpx') return false;
    return !(await supportsJp2());
  }

  async decode(file: Blob | ArrayBuffer, options?: DecodeOptions): Promise<Blob> {
    if (await supportsJp2()) {
      return file instanceof Blob ? file : new Blob([file], { type: 'image/jp2' });
    }

    const arrayBuffer = file instanceof Blob ? await file.arrayBuffer() : file;
    const codestream = extractCodestream(new Uint8Array(arrayBuffer));
    const outputFormat = options?.outputFormat || 'image/png';

    const { rgba, width, height } = await decodeInWorker(codestream);
    return rgbaToBlob(rgba, width, height, outputFormat);
  }

  async getMetadata(_file: Blob | ArrayBuffer): Promise<ImageMetadata> {
    return {
      format: 'jp2',
    };
  }
}

export default new Jp2Loader();
