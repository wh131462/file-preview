import type { ImageDecoder, DecodeOptions, ImageMetadata } from './types';

/**
 * RAW 格式集合
 */
const RAW_MIME_TYPES = new Set([
  'image/x-canon-cr2',
  'image/x-nikon-nef',
  'image/x-sony-arw',
  'image/x-adobe-dng',
  'image/x-fuji-raf',
  'image/x-olympus-orf',
]);

/**
 * 从 RAW 文件（基于 TIFF 容器）中提取嵌入的 JPEG 缩略图
 *
 * 大部分 RAW 格式（CR2、NEF、ARW、DNG、ORF）基于 TIFF 容器，
 * 其中 IFD1（或 SubIFD）包含完整尺寸预览或缩略图的 JPEG 数据。
 *
 * @param buffer RAW 文件 ArrayBuffer
 * @returns 嵌入的 JPEG Blob，如果未找到则返回 null
 */
async function extractEmbeddedJpeg(buffer: ArrayBuffer): Promise<Blob | null> {
  const bytes = new Uint8Array(buffer);

  // 1. 解析 TIFF 头部判断字节序
  if (bytes.length < 8) return null;

  let littleEndian: boolean;
  if (bytes[0] === 0x49 && bytes[1] === 0x49) {
    littleEndian = true;
  } else if (bytes[0] === 0x4d && bytes[1] === 0x4d) {
    littleEndian = false;
  } else {
    // 富士 RAF 不是 TIFF 容器，尝试直接搜索 JPEG SOI 标记
    return scanForJpegSoi(bytes);
  }

  const dataView = new DataView(buffer);
  const read16 = (offset: number) => dataView.getUint16(offset, littleEndian);
  const read32 = (offset: number) => dataView.getUint32(offset, littleEndian);

  // 验证 TIFF 魔数（42）
  if (read16(2) !== 0x002a) {
    return scanForJpegSoi(bytes);
  }

  // 2. 遍历所有 IFD，查找包含 JPEG 的入口
  // 寻找 tag 0x0201 (JPEGInterchangeFormat) + 0x0202 (JPEGInterchangeFormatLength)
  // 或 tag 0x0111 (StripOffsets) + 0x0117 (StripByteCounts) 当 Compression=6 (JPEG)
  let ifdOffset = read32(4);
  let bestOffset = 0;
  let bestLength = 0;

  for (let i = 0; i < 10 && ifdOffset !== 0 && ifdOffset + 2 < bytes.length; i++) {
    const entryCount = read16(ifdOffset);
    let jpegOffset = 0;
    let jpegLength = 0;

    for (let j = 0; j < entryCount; j++) {
      const entryOffset = ifdOffset + 2 + j * 12;
      if (entryOffset + 12 > bytes.length) break;

      const tag = read16(entryOffset);
      const valueOffset = entryOffset + 8;

      if (tag === 0x0201) {
        jpegOffset = read32(valueOffset);
      } else if (tag === 0x0202) {
        jpegLength = read32(valueOffset);
      }
    }

    // 选择最大的 JPEG（通常是完整尺寸预览，而非缩略图）
    if (jpegOffset > 0 && jpegLength > bestLength && jpegOffset + jpegLength <= bytes.length) {
      bestOffset = jpegOffset;
      bestLength = jpegLength;
    }

    // 下一个 IFD
    const nextIfdPtr = ifdOffset + 2 + entryCount * 12;
    if (nextIfdPtr + 4 > bytes.length) break;
    ifdOffset = read32(nextIfdPtr);
  }

  if (bestOffset > 0 && bestLength > 0) {
    return new Blob([bytes.slice(bestOffset, bestOffset + bestLength)], {
      type: 'image/jpeg',
    });
  }

  // fallback：扫描 SOI 标记
  return scanForJpegSoi(bytes);
}

/**
 * 兜底方案：扫描整个文件查找 JPEG SOI（FFD8）和 EOI（FFD9）标记
 */
function scanForJpegSoi(bytes: Uint8Array): Blob | null {
  let bestStart = -1;
  let bestEnd = -1;
  let bestLength = 0;

  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      // 找到 SOI，向后查找 EOI
      const start = i;
      for (let j = i + 2; j < bytes.length - 1; j++) {
        if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
          const length = j + 2 - start;
          if (length > bestLength) {
            bestStart = start;
            bestEnd = j + 2;
            bestLength = length;
          }
          i = j + 2;
          break;
        }
      }
    }
  }

  if (bestStart >= 0 && bestEnd > bestStart) {
    return new Blob([bytes.slice(bestStart, bestEnd)], { type: 'image/jpeg' });
  }

  return null;
}

/**
 * RAW 图片解码器
 *
 * 默认模式：提取嵌入的 JPEG 缩略图（快速、零依赖）
 * 完整模式：暂未集成 RAW 完整像素解码引擎，自动退回到嵌入预览
 */
class RawLoader implements ImageDecoder {
  async needsDecode(mimeType: string): Promise<boolean> {
    return RAW_MIME_TYPES.has(mimeType);
  }

  async decode(file: Blob | ArrayBuffer, options?: DecodeOptions): Promise<Blob> {
    const arrayBuffer = file instanceof Blob ? await file.arrayBuffer() : file;

    // 默认模式：提取嵌入的 JPEG 缩略图（零依赖、快速）
    if (!options?.fullQuality) {
      const jpegBlob = await extractEmbeddedJpeg(arrayBuffer);
      if (jpegBlob) {
        return jpegBlob;
      }
      throw new Error('未在 RAW 文件中找到嵌入的预览图像（该文件可能已被剥离 JPEG 预览）。');
    }

    // 完整模式：当前版本未集成 RAW 完整解码引擎
    // 浏览器端可用的 RAW 解码器尚不稳定（libraw-wasm 等仍在试验阶段）
    // 退回到嵌入预览图，避免误导用户
    const jpegBlob = await extractEmbeddedJpeg(arrayBuffer);
    if (jpegBlob) {
      return jpegBlob;
    }
    throw new Error('完整 RAW 解码暂未实现，且无法提取嵌入预览图。');
  }

  async getMetadata(_file: Blob | ArrayBuffer): Promise<ImageMetadata> {
    return {
      format: 'raw',
    };
  }
}

export default new RawLoader();
