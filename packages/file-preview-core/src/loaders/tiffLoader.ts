import type { ImageDecoder, DecodeOptions, ImageMetadata } from './types';

/**
 * TIFF 解码选项扩展（支持多页）
 */
interface TiffDecodeOptions extends DecodeOptions {
  /** 页码（1-based，默认 1） */
  page?: number;
}

/**
 * TIFF 图片解码器
 * 基于 utif (UTIF.js) 库，支持单页和多页 TIFF
 */
class TiffLoader implements ImageDecoder {
  /**
   * TIFF 浏览器均不原生支持（除 Safari 部分版本），始终需要解码
   */
  async needsDecode(mimeType: string): Promise<boolean> {
    return mimeType === 'image/tiff';
  }

  /**
   * 解码 TIFF 文件为 PNG Blob
   */
  async decode(file: Blob | ArrayBuffer, options?: TiffDecodeOptions): Promise<Blob> {
    try {
      // 动态加载 utif 库（运行时由使用方包提供）
      // @ts-ignore - 无类型声明，仅运行时存在
      const UTIF = await import('utif');

      const arrayBuffer = file instanceof Blob ? await file.arrayBuffer() : file;
      const ifds = UTIF.decode(arrayBuffer);

      if (ifds.length === 0) {
        throw new Error('TIFF 文件不包含任何图像');
      }

      // 默认渲染第 1 页（1-based）
      const pageIndex = Math.max(0, Math.min((options?.page ?? 1) - 1, ifds.length - 1));
      const ifd = ifds[pageIndex];

      UTIF.decodeImage(arrayBuffer, ifd);
      const rgba = UTIF.toRGBA8(ifd);

      const width = ifd.width;
      const height = ifd.height;

      // 渲染到 Canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法创建 Canvas 2D 上下文');
      }

      const imageData = new ImageData(new Uint8ClampedArray(rgba.buffer), width, height);
      ctx.putImageData(imageData, 0, 0);

      // 转为 PNG Blob
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('TIFF Canvas 转换为 PNG 失败'));
            }
          },
          options?.outputFormat || 'image/png'
        );
      });
    } catch (error: any) {
      throw new Error(`TIFF 解码失败: ${error?.message || '未知错误'}`);
    }
  }

  /**
   * 获取 TIFF 元数据（包括页数）
   */
  async getMetadata(file: Blob | ArrayBuffer): Promise<ImageMetadata> {
    try {
      // @ts-ignore - 无类型声明，仅运行时存在
      const UTIF = await import('utif');
      const arrayBuffer = file instanceof Blob ? await file.arrayBuffer() : file;
      const ifds = UTIF.decode(arrayBuffer);

      const firstIfd = ifds[0];
      return {
        format: 'tiff',
        pageCount: ifds.length,
        width: firstIfd?.width,
        height: firstIfd?.height,
      };
    } catch {
      return {
        format: 'tiff',
        pageCount: 1,
      };
    }
  }
}

export default new TiffLoader();
