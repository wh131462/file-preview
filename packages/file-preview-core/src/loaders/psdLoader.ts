import { PreviewError } from '../i18n';
import type { ImageDecoder, DecodeOptions, ImageMetadata } from './types';

/**
 * PSD (Adobe Photoshop) 图片解码器
 *
 * 基于 ag-psd 库解析 PSD 文件，提取合并后的预览图层。
 * 不解析图层结构、文字图层、调整层效果——仅展示最终合并效果。
 */
class PsdLoader implements ImageDecoder {
  async needsDecode(mimeType: string): Promise<boolean> {
    return mimeType === 'image/vnd.adobe.photoshop';
  }

  async decode(file: Blob | ArrayBuffer, options?: DecodeOptions): Promise<Blob> {
    try {
      // 动态加载 ag-psd 库（运行时由使用方包提供）
      // @ts-ignore - 无类型声明，仅运行时存在
      const agPsdModule = await import('ag-psd');
      const readPsd = (agPsdModule as any).readPsd || (agPsdModule as any).default?.readPsd;
      if (typeof readPsd !== 'function') {
        throw new PreviewError('image.psd_invalid_api');
      }

      const arrayBuffer = file instanceof Blob ? await file.arrayBuffer() : file;

      // 解析 PSD：要求合并图层数据
      const psd = readPsd(arrayBuffer, {
        skipLayerImageData: true, // 不需要单独图层数据
        skipCompositeImageData: false, // 需要合并预览
        skipThumbnail: true,
        // 保留像素数据，避免 Worker 环境依赖 document/HTMLCanvasElement
        useImageData: true,
      });

      if (psd.imageData && psd.width && psd.height) {
        const imageData = new ImageData(
          new Uint8ClampedArray(psd.imageData.data || psd.imageData),
          psd.width,
          psd.height,
        );
        return await imageDataToBlob(imageData, options?.outputFormat || 'image/png');
      }

      throw new PreviewError('image.psd_no_preview');
    } catch (error: any) {
      throw new PreviewError('image.psd_decode_failed', undefined, error || new PreviewError('common.unknown_error'));
    }
  }

  async getMetadata(file: Blob | ArrayBuffer): Promise<ImageMetadata> {
    try {
      // @ts-ignore - 无类型声明，仅运行时存在
      const agPsdModule = await import('ag-psd');
      const readPsd = (agPsdModule as any).readPsd || (agPsdModule as any).default?.readPsd;
      if (typeof readPsd !== 'function') {
        return { format: 'psd' };
      }

      const arrayBuffer = file instanceof Blob ? await file.arrayBuffer() : file;
      const psd = readPsd(arrayBuffer, {
        skipLayerImageData: true,
        skipCompositeImageData: true,
        skipThumbnail: true,
      });

      return {
        format: 'psd',
        width: psd.width,
        height: psd.height,
      };
    } catch {
      return { format: 'psd' };
    }
  }
}

async function imageDataToBlob(imageData: ImageData, type: string): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const context = canvas.getContext('2d');
    if (!context) throw new PreviewError('image.offscreen_context_failed');
    context.putImageData(imageData, 0, 0);
    return canvas.convertToBlob({ type });
  }

  if (typeof document === 'undefined') {
    throw new PreviewError('image.offscreen_unsupported');
  }

  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const context = canvas.getContext('2d');
  if (!context) throw new PreviewError('image.canvas_context_failed');
  context.putImageData(imageData, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new PreviewError('image.canvas_export_failed', { format: 'PSD', output: 'Blob' }));
      },
      type
    );
  });
}

export default new PsdLoader();
