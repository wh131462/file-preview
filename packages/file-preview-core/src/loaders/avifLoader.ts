import type { ImageDecoder, DecodeOptions, ImageMetadata } from './types';

/**
 * 缓存浏览器原生 AVIF 支持检测结果
 */
let nativeAvifSupport: boolean | null = null;

/**
 * 检测浏览器是否原生支持 AVIF
 * 使用 1x1 像素的 AVIF 测试图片
 */
async function supportsAVIF(): Promise<boolean> {
  if (nativeAvifSupport !== null) {
    return nativeAvifSupport;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      nativeAvifSupport = img.width === 1 && img.height === 1;
      resolve(nativeAvifSupport);
    };
    img.onerror = () => {
      nativeAvifSupport = false;
      resolve(false);
    };
    // 1x1 AVIF 测试图片（最小有效 AVIF）
    img.src =
      'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=';
  });
}

/**
 * AVIF 图片解码器
 * 现代浏览器（Chrome 85+、Firefox 93+、Safari 16+）已原生支持 AVIF
 * 不支持时降级到 WASM 解码
 */
class AvifLoader implements ImageDecoder {
  /**
   * 检测是否需要解码：仅在浏览器不原生支持 AVIF 时需要
   */
  async needsDecode(mimeType: string): Promise<boolean> {
    if (mimeType !== 'image/avif') return false;
    return !(await supportsAVIF());
  }

  /**
   * 解码 AVIF 文件为 PNG Blob
   */
  async decode(file: Blob | ArrayBuffer, options?: DecodeOptions): Promise<Blob> {
    // 双重检查：如果浏览器原生支持，则不应进入此方法
    if (await supportsAVIF()) {
      // 直接返回原 Blob（让浏览器自己渲染）
      return file instanceof Blob ? file : new Blob([file], { type: 'image/avif' });
    }

    try {
      // 动态加载 @jsquash/avif 解码库（运行时由使用方包提供）
      // @ts-ignore - 无类型声明，仅运行时存在
      const avifModule = await import('@jsquash/avif');

      const arrayBuffer = file instanceof Blob ? await file.arrayBuffer() : file;

      // 解码为 ImageData
      const imageData = await avifModule.decode(arrayBuffer);

      // 渲染到 Canvas
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法创建 Canvas 2D 上下文');
      }
      ctx.putImageData(imageData, 0, 0);

      // 转为 PNG Blob
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('AVIF Canvas 转换为 PNG 失败'));
            }
          },
          options?.outputFormat || 'image/png'
        );
      });
    } catch (error: any) {
      throw new Error(`AVIF 解码失败: ${error?.message || '未知错误'}`);
    }
  }

  /**
   * 获取 AVIF 元数据
   */
  async getMetadata(_file: Blob | ArrayBuffer): Promise<ImageMetadata> {
    return {
      format: 'avif',
    };
  }
}

export default new AvifLoader();
