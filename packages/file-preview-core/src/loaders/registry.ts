import type { ImageDecoder, LoaderRegistry } from './types';
import type { PreviewFile } from '../types';
import { getMimeTypeFromFileName, isAdvancedImageFormat } from '../utils/mimeTypes';

/**
 * 全局 loader 注册表
 */
const loaderRegistry: LoaderRegistry = new Map();

/**
 * 已加载的 loader 实例缓存
 */
const loaderCache = new Map<string, ImageDecoder>();

/**
 * 注册一个图片解码器
 * @param mimeType MIME 类型
 * @param loader 解码器实例
 */
export function registerLoader(mimeType: string, loader: ImageDecoder): void {
  loaderRegistry.set(mimeType, loader);
}

/**
 * 获取指定 MIME 类型的 loader
 * @param mimeType MIME 类型
 * @returns loader 实例，未注册时返回 null
 */
export function getLoader(mimeType: string): ImageDecoder | null {
  return loaderRegistry.get(mimeType) || null;
}

/**
 * 检查是否有指定 MIME 类型的 loader
 * @param mimeType MIME 类型
 * @returns 是否已注册
 */
export function hasLoader(mimeType: string): boolean {
  return loaderRegistry.has(mimeType);
}

/**
 * 动态加载并获取指定 MIME 类型的 loader
 * @param mimeType MIME 类型
 * @returns loader 实例，不支持时返回 null
 */
export async function getLoaderForMimeType(mimeType: string): Promise<ImageDecoder | null> {
  // 检查缓存
  if (loaderCache.has(mimeType)) {
    return loaderCache.get(mimeType)!;
  }

  // 检查是否为高级图片格式
  if (!isAdvancedImageFormat(mimeType)) {
    return null;
  }

  try {
    let loader: ImageDecoder | null = null;

    // 根据 MIME 类型动态 import 对应的 loader
    if (mimeType === 'image/heic' || mimeType === 'image/heif') {
      const module = await import('./heicLoader');
      loader = module.default;
    } else if (mimeType === 'image/avif') {
      const module = await import('./avifLoader');
      loader = module.default;
    } else if (mimeType === 'image/tiff') {
      const module = await import('./tiffLoader');
      loader = module.default;
    } else if (
      mimeType === 'image/x-canon-cr2' ||
      mimeType === 'image/x-nikon-nef' ||
      mimeType === 'image/x-sony-arw' ||
      mimeType === 'image/x-adobe-dng' ||
      mimeType === 'image/x-fuji-raf' ||
      mimeType === 'image/x-olympus-orf'
    ) {
      const module = await import('./rawLoader');
      loader = module.default;
    } else if (mimeType === 'image/vnd.adobe.photoshop') {
      const module = await import('./psdLoader');
      loader = module.default;
    } else if (mimeType === 'image/jp2' || mimeType === 'image/jpx') {
      const module = await import('./jp2Loader');
      loader = module.default;
    }

    // 缓存 loader
    if (loader) {
      loaderCache.set(mimeType, loader);
    }

    return loader;
  } catch (error) {
    console.warn(`Failed to load image decoder for ${mimeType}:`, error);
    return null;
  }
}

/**
 * 检测图片格式（优先级：MIME type > 扩展名 > 文件头魔数）
 * @param file 文件对象
 * @returns MIME 类型字符串
 */
export async function detectImageFormat(file: File | PreviewFile): Promise<string> {
  // 1. 优先使用显式指定的 MIME type
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type;
  }

  // 2. 从扩展名推断
  const mimeFromExt = getMimeTypeFromFileName(file.name);
  if (mimeFromExt !== 'application/octet-stream') {
    return mimeFromExt;
  }

  // 3. 读取文件头魔数（仅对 Blob/File 类型）
  if (file instanceof Blob || (file instanceof File)) {
    const mimeFromMagic = await detectByMagicNumber(file as Blob);
    if (mimeFromMagic !== 'application/octet-stream') {
      return mimeFromMagic;
    }
  }

  return 'application/octet-stream';
}

/**
 * 通过文件头魔数检测格式
 * @param blob 文件 Blob
 * @returns MIME 类型
 */
async function detectByMagicNumber(blob: Blob): Promise<string> {
  try {
    const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());

    // HEIC: ftyp heic / ftyp heix / ftyp mif1
    if (
      header[4] === 0x66 &&
      header[5] === 0x74 &&
      header[6] === 0x79 &&
      header[7] === 0x70
    ) {
      const brand = String.fromCharCode(...header.slice(8, 12));
      if (brand === 'heic' || brand === 'heix' || brand === 'mif1') {
        return 'image/heic';
      }
    }

    // TIFF: II*\0 (little-endian) 或 MM\0* (big-endian)
    if (
      (header[0] === 0x49 && header[1] === 0x49 && header[2] === 0x2a && header[3] === 0x00) ||
      (header[0] === 0x4d && header[1] === 0x4d && header[2] === 0x00 && header[3] === 0x2a)
    ) {
      return 'image/tiff';
    }

    // AVIF: ftyp avif
    if (
      header[4] === 0x66 &&
      header[5] === 0x74 &&
      header[6] === 0x79 &&
      header[7] === 0x70
    ) {
      const brand = String.fromCharCode(...header.slice(8, 12));
      if (brand === 'avif') {
        return 'image/avif';
      }
    }

    // PSD: 8BPS
    if (
      header[0] === 0x38 &&
      header[1] === 0x42 &&
      header[2] === 0x50 &&
      header[3] === 0x53
    ) {
      return 'image/vnd.adobe.photoshop';
    }

    // JPEG 2000: FF 4F FF 51 (SOC + SIZ markers)
    if (header[0] === 0xff && header[1] === 0x4f && header[2] === 0xff && header[3] === 0x51) {
      return 'image/jp2';
    }
  } catch (error) {
    console.warn('Failed to detect image format by magic number:', error);
  }

  return 'application/octet-stream';
}
