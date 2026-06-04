/// <reference lib="webworker" />

/**
 * JPEG 2000 解码 Worker
 *
 * 在独立线程运行 jpeg2000 / OpenJPEG WASM 解码，避免主线程长任务阻塞
 * CSS 动画与 React commit。Worker 内部仍按 jpeg2000 → openjpeg 顺序回退。
 *
 * 注意：static import 是为了让 vite `?worker&inline` 把库代码一起 inline 进 worker base64。
 * 若改成 dynamic import，会生成独立 chunk，inline worker 无法解析相对路径。
 */

// @ts-ignore - 无类型声明
import * as jpegModule from 'jpeg2000';
// @ts-ignore - 无类型声明
import OpenJPEGFactory from '@cornerstonejs/codec-openjpeg';

interface DecodeRequest {
  id: number;
  codestream: Uint8Array;
}

interface DecodeResult {
  id: number;
  ok: true;
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
}

interface DecodeError {
  id: number;
  ok: false;
  error: string;
}

function tilesToRgba(
  tiles: Array<{ items: Uint8Array; width: number; height: number; left: number; top: number }>,
  width: number,
  height: number,
  componentsCount: number
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (const tile of tiles) {
    const { items, width: tw, height: th, left, top } = tile;
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const srcIdx = (y * tw + x) * componentsCount;
        const dstIdx = ((top + y) * width + (left + x)) * 4;
        if (componentsCount === 1) {
          const v = items[srcIdx];
          rgba[dstIdx] = v;
          rgba[dstIdx + 1] = v;
          rgba[dstIdx + 2] = v;
          rgba[dstIdx + 3] = 255;
        } else if (componentsCount >= 3) {
          rgba[dstIdx] = items[srcIdx];
          rgba[dstIdx + 1] = items[srcIdx + 1];
          rgba[dstIdx + 2] = items[srcIdx + 2];
          rgba[dstIdx + 3] = componentsCount >= 4 ? items[srcIdx + 3] : 255;
        }
      }
    }
  }
  return rgba;
}

function decodeWithJpeg2000(
  codestream: Uint8Array
): { rgba: Uint8ClampedArray; width: number; height: number } {
  const mod: any = jpegModule;
  const JpxImage = mod.JpxImage || mod.default?.JpxImage;
  if (typeof JpxImage !== 'function') {
    throw new Error('jpeg2000 库 API 不符合预期：未找到 JpxImage');
  }

  const jpx = new JpxImage();
  const bufferLike = Object.assign(codestream, {
    readUInt8(offset: number): number {
      return codestream[offset];
    },
    readInt8(offset: number): number {
      return (codestream[offset] << 24) >> 24;
    },
    readUInt16BE(offset: number): number {
      return (codestream[offset] << 8) | codestream[offset + 1];
    },
    readInt16BE(offset: number): number {
      return (((codestream[offset] << 8) | codestream[offset + 1]) << 16) >> 16;
    },
    readUInt32BE(offset: number): number {
      return (
        codestream[offset] * 0x1000000 +
        ((codestream[offset + 1] << 16) | (codestream[offset + 2] << 8) | codestream[offset + 3])
      );
    },
  });
  jpx.parse(bufferLike as any);

  return {
    rgba: tilesToRgba(jpx.tiles, jpx.width, jpx.height, jpx.componentsCount),
    width: jpx.width,
    height: jpx.height,
  };
}

let openJpegModulePromise: Promise<any> | null = null;
async function loadOpenJpegModule(): Promise<any> {
  if (!openJpegModulePromise) {
    openJpegModulePromise = (async () => {
      const factory: any =
        typeof OpenJPEGFactory === 'function'
          ? OpenJPEGFactory
          : (OpenJPEGFactory as any)?.default || OpenJPEGFactory;
      if (typeof factory !== 'function') {
        throw new Error('@cornerstonejs/codec-openjpeg 库 API 不符合预期：未找到工厂函数');
      }
      return await factory();
    })();
  }
  return openJpegModulePromise;
}

function openJpegBufferToRgba(
  buffer: Uint8Array,
  frameInfo: {
    width: number;
    height: number;
    bitsPerSample: number;
    componentCount: number;
    isSigned?: boolean;
  }
): { rgba: Uint8ClampedArray; width: number; height: number } {
  const { width, height, bitsPerSample, componentCount, isSigned } = frameInfo;
  const bytesPerSample = bitsPerSample > 8 ? 2 : 1;
  const rgba = new Uint8ClampedArray(width * height * 4);
  const pixelCount = width * height;
  const shift = Math.max(0, bitsPerSample - 8);
  const signOffset = isSigned ? 1 << (bitsPerSample - 1) : 0;

  const readSample = (byteOffset: number): number => {
    let raw: number;
    if (bytesPerSample === 2) {
      raw = buffer[byteOffset] | (buffer[byteOffset + 1] << 8);
      if (isSigned) raw = (raw << 16) >> 16;
    } else {
      raw = isSigned ? (buffer[byteOffset] << 24) >> 24 : buffer[byteOffset];
    }
    let v = raw + signOffset;
    v = v >> shift;
    if (v < 0) v = 0;
    else if (v > 255) v = 255;
    return v;
  };

  if (componentCount === 1) {
    for (let i = 0; i < pixelCount; i++) {
      const v = readSample(i * bytesPerSample);
      const o = i * 4;
      rgba[o] = v;
      rgba[o + 1] = v;
      rgba[o + 2] = v;
      rgba[o + 3] = 255;
    }
  } else {
    const stride = componentCount * bytesPerSample;
    for (let i = 0; i < pixelCount; i++) {
      const base = i * stride;
      const o = i * 4;
      rgba[o] = readSample(base);
      rgba[o + 1] = readSample(base + bytesPerSample);
      rgba[o + 2] = readSample(base + 2 * bytesPerSample);
      rgba[o + 3] = componentCount >= 4 ? readSample(base + 3 * bytesPerSample) : 255;
    }
  }
  return { rgba, width, height };
}

async function decodeWithOpenJpeg(
  codestream: Uint8Array
): Promise<{ rgba: Uint8ClampedArray; width: number; height: number }> {
  const Module = await loadOpenJpegModule();
  if (!Module || typeof Module.J2KDecoder !== 'function') {
    throw new Error('@cornerstonejs/codec-openjpeg 未暴露 J2KDecoder');
  }
  const decoder = new Module.J2KDecoder();
  try {
    const encodedBuffer = decoder.getEncodedBuffer(codestream.length);
    encodedBuffer.set(codestream);
    decoder.decode();
    const decodedBuffer: Uint8Array = decoder.getDecodedBuffer();
    const frameInfo = decoder.getFrameInfo();
    return openJpegBufferToRgba(decodedBuffer, frameInfo);
  } finally {
    if (typeof decoder.delete === 'function') {
      try {
        decoder.delete();
      } catch {
        /* ignore */
      }
    }
  }
}

self.onmessage = async (e: MessageEvent<DecodeRequest>) => {
  const { id, codestream } = e.data;
  const errors: string[] = [];

  try {
    const r = decodeWithJpeg2000(codestream);
    const result: DecodeResult = { id, ok: true, ...r };
    (self as DedicatedWorkerGlobalScope).postMessage(result, [r.rgba.buffer]);
    return;
  } catch (err: any) {
    errors.push(`jpeg2000: ${err?.message || '未知错误'}`);
  }

  try {
    const r = await decodeWithOpenJpeg(codestream);
    const result: DecodeResult = { id, ok: true, ...r };
    (self as DedicatedWorkerGlobalScope).postMessage(result, [r.rgba.buffer]);
    return;
  } catch (err: any) {
    errors.push(`openjpeg: ${err?.message || '未知错误'}`);
  }

  const errResult: DecodeError = { id, ok: false, error: errors.join('；') };
  (self as DedicatedWorkerGlobalScope).postMessage(errResult);
};

export {};
