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
        throw new Error('ag-psd 库 API 不符合预期');
      }

      const arrayBuffer = file instanceof Blob ? await file.arrayBuffer() : file;

      // 解析 PSD：要求合并图层数据
      const psd = readPsd(arrayBuffer, {
        skipLayerImageData: true, // 不需要单独图层数据
        skipCompositeImageData: false, // 需要合并预览
        skipThumbnail: false,
      });

      // 优先使用合并 canvas
      const canvas: HTMLCanvasElement | undefined = psd.canvas;
      if (!canvas) {
        // 退回：尝试从 imageData 构建 canvas
        if (psd.imageData && psd.width && psd.height) {
          const fallback = document.createElement('canvas');
          fallback.width = psd.width;
          fallback.height = psd.height;
          const ctx = fallback.getContext('2d');
          if (!ctx) throw new Error('无法创建 Canvas 2D 上下文');

          const imageData = new ImageData(
            new Uint8ClampedArray(psd.imageData.data || psd.imageData),
            psd.width,
            psd.height
          );
          ctx.putImageData(imageData, 0, 0);
          return await canvasToBlob(fallback, options?.outputFormat || 'image/png');
        }

        throw new Error('PSD 文件不包含合并的预览图像（可能仅含图层数据）');
      }

      return await canvasToBlob(canvas, options?.outputFormat || 'image/png');
    } catch (error: any) {
      throw new Error(`PSD 解码失败: ${error?.message || '未知错误'}`);
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

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('PSD Canvas 转换为 Blob 失败'));
      },
      type
    );
  });
}

export default new PsdLoader();
